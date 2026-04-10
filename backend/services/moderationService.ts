/**
 * Moderation Service
 *
 * Orchestrates the full moderation workflow:
 * 1. New ad → auto-scan → assign moderation status
 * 2. State transitions (pending_review → approved / flagged / etc.)
 * 3. Admin actions (approve, reject, suspend, investigate)
 * 4. Audit trail for every transition
 *
 * This is the single entry point for all moderation decisions.
 */

import mongoose from "mongoose";
import Ad, { AdDocument, ModerationStatus } from "../models/Ad";
import User from "../models/User";
import { RiskProfile } from "../models/RiskProfile";
import { AuditLog } from "../models/AuditLog";
import { fullAdScan, hashAdImages } from "./redFlagDetectionService";
import { addRiskPoints, recalculateUserRisk, getRiskLevel, getEnforcementRules, RISK_POINTS } from "./riskScoringService";
import { logInfo, logWarn, logError } from "../utils/logger";

// ============================================
// AUTO-MODERATION THRESHOLDS
// ============================================

const AUTO_APPROVE_THRESHOLD = 10;   // Risk points below this = auto-approve
const FLAG_THRESHOLD = 15;           // Risk points at/above this = flagged

// ============================================
// MODERATION RESULT
// ============================================

export interface ModerationResult {
  moderationStatus: ModerationStatus;
  moderationScore: number;
  moderationFlags: string[];
  autoApproved: boolean;
  flagged: boolean;
  reason: string;
}

// ============================================
// NEW AD MODERATION (called at ad creation)
// ============================================

/**
 * Run moderation pipeline on a newly created ad.
 * Sets moderationStatus, moderationScore, moderationFlags, imageHashes.
 * Updates the ad document in-place and returns the moderation decision.
 */
export async function moderateNewAd(adId: string | mongoose.Types.ObjectId): Promise<ModerationResult> {
  const ad = await Ad.findById(adId);
  if (!ad) throw new Error(`Ad ${adId} not found`);

  // Step 1: Generate image hashes for duplicate detection
  const imageHashes = hashAdImages(ad.images || []);

  // Step 2: Run full red flag scan
  const scanResult = await fullAdScan(
    { ...ad.toObject(), imageHashes } as unknown as AdDocument,
    { checkImages: imageHashes.length > 0, checkPhone: !!ad.phone }
  );

  // Step 3: Check user risk level for enforcement rules
  let userRiskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (ad.userId) {
    const riskProfile = await RiskProfile.getOrCreate(String(ad.userId));
    userRiskLevel = riskProfile.riskLevel || getRiskLevel(riskProfile.riskScore || 0);
  }
  const enforcement = getEnforcementRules(userRiskLevel);

  // Step 4: Determine moderation status
  let moderationStatus: ModerationStatus;
  let autoApproved = false;
  let reason: string;

  if (enforcement.autoSuspend) {
    // Critical risk user — suspend ad immediately
    moderationStatus = "suspended";
    reason = "Account is critical risk — ad auto-suspended";
  } else if (enforcement.requiresPreModeration || scanResult.shouldFlag) {
    // High risk user or red flags detected → flag for review
    moderationStatus = "flagged";
    reason = scanResult.shouldFlag
      ? `Red flags detected: ${scanResult.flags.length} issue(s), ${scanResult.totalRiskPoints} risk points`
      : `User risk level: ${userRiskLevel} — requires pre-moderation`;
  } else if (enforcement.requiresModeration) {
    // Medium risk user → pending manual review
    moderationStatus = "pending_review";
    reason = `User risk level: ${userRiskLevel} — manual moderation required`;
  } else if (scanResult.totalRiskPoints < AUTO_APPROVE_THRESHOLD) {
    // Low risk, no flags → auto-approve
    moderationStatus = "auto_approved";
    autoApproved = true;
    reason = "Passed automated checks — auto-approved";
  } else {
    // Some low-level flags but not enough to hard-flag
    moderationStatus = "pending_review";
    reason = `Low-level flags detected (${scanResult.totalRiskPoints} points) — queued for review`;
  }

  // Step 5: Update ad with moderation data
  const updateData: any = {
    moderationStatus,
    moderationScore: scanResult.totalRiskPoints,
    moderationFlags: scanResult.flags,
    imageHashes,
  };

  // If auto-approved, also set status to approved
  if (autoApproved) {
    updateData.status = "approved";
  }

  await Ad.findByIdAndUpdate(adId, { $set: updateData });

  // Step 6: Audit log
  const auditAction = autoApproved ? "AD_AUTO_APPROVED" : scanResult.shouldFlag ? "AD_FLAGGED" : "AD_CREATED";
  await AuditLog.log(auditAction, {
    adId: new mongoose.Types.ObjectId(String(adId)),
    userId: ad.userId,
    isSystem: true,
    severity: moderationStatus === "suspended" ? "critical" : moderationStatus === "flagged" ? "warning" : "info",
    newValue: { moderationStatus, moderationScore: scanResult.totalRiskPoints },
    metadata: {
      flags: scanResult.flags,
      textMatches: scanResult.textFlags.matches.length,
      imageReuse: scanResult.imageReuse.reused,
      phoneReuse: scanResult.phoneReuse.reused,
      userRiskLevel,
    },
    reason,
  });

  // Step 7: Update user risk if flags were found
  if (scanResult.shouldFlag && ad.userId) {
    await addRiskPoints(String(ad.userId), RISK_POINTS.RED_FLAG_TEXT, "RED_FLAG_IN_AD", `${scanResult.flags.length} red flags in ad ${adId}`);
  }

  logInfo("Ad moderation completed", {
    adId: String(adId),
    moderationStatus,
    moderationScore: scanResult.totalRiskPoints,
    flagCount: scanResult.flags.length,
    autoApproved,
  });

  return {
    moderationStatus,
    moderationScore: scanResult.totalRiskPoints,
    moderationFlags: scanResult.flags,
    autoApproved,
    flagged: scanResult.shouldFlag,
    reason,
  };
}

// ============================================
// AD RE-SCAN (called at ad update)
// ============================================

/**
 * Re-scan an ad after edits. May change moderation status.
 */
export async function rescanAd(adId: string | mongoose.Types.ObjectId): Promise<ModerationResult> {
  const ad = await Ad.findById(adId);
  if (!ad) throw new Error(`Ad ${adId} not found`);

  const previousStatus = ad.moderationStatus;

  // Regenerate image hashes
  const imageHashes = hashAdImages(ad.images || []);

  // Re-run scan
  const scanResult = await fullAdScan(
    { ...ad.toObject(), imageHashes } as unknown as AdDocument,
    { checkImages: imageHashes.length > 0, checkPhone: !!ad.phone }
  );

  let moderationStatus: ModerationStatus = ad.moderationStatus || "pending_review";
  let reason = "Re-scan after edit";

  // If previously approved/auto_approved but now has flags → flag it
  if ((previousStatus === "approved" || previousStatus === "auto_approved") && scanResult.shouldFlag) {
    moderationStatus = "flagged";
    reason = `New red flags detected after edit: ${scanResult.flags.length} issue(s)`;
  } else if (!scanResult.shouldFlag && scanResult.totalRiskPoints < AUTO_APPROVE_THRESHOLD) {
    // If previously flagged and now clean, move back to pending review (not auto-approve)
    if (previousStatus === "flagged") {
      moderationStatus = "pending_review";
      reason = "Flags cleared after edit — moved to pending review";
    }
  }

  await Ad.findByIdAndUpdate(adId, {
    $set: {
      moderationStatus,
      moderationScore: scanResult.totalRiskPoints,
      moderationFlags: scanResult.flags,
      imageHashes,
    },
  });

  // Audit log
  if (moderationStatus !== previousStatus) {
    await AuditLog.log("AD_EDITED", {
      adId: new mongoose.Types.ObjectId(String(adId)),
      userId: ad.userId,
      isSystem: true,
      severity: moderationStatus === "flagged" ? "warning" : "info",
      previousValue: { moderationStatus: previousStatus },
      newValue: { moderationStatus, moderationScore: scanResult.totalRiskPoints },
      reason,
    });
  }

  return {
    moderationStatus,
    moderationScore: scanResult.totalRiskPoints,
    moderationFlags: scanResult.flags,
    autoApproved: false,
    flagged: scanResult.shouldFlag,
    reason,
  };
}

// ============================================
// ADMIN MODERATION ACTIONS
// ============================================

export interface AdminModerationAction {
  adId: string;
  adminId: string;
  action: "approve" | "reject" | "suspend" | "investigate" | "unflag";
  note?: string;
  rejectionReason?: string;
}

/**
 * Admin takes moderation action on an ad.
 */
export async function adminModerateAd(params: AdminModerationAction): Promise<{
  success: boolean;
  moderationStatus: ModerationStatus;
  message: string;
}> {
  const { adId, adminId, action, note, rejectionReason } = params;

  const ad = await Ad.findById(adId);
  if (!ad) throw new Error(`Ad ${adId} not found`);

  const previousStatus = ad.moderationStatus;
  let newStatus: ModerationStatus;
  let adStatus = ad.status;

  switch (action) {
    case "approve":
      newStatus = "approved";
      adStatus = "approved";
      // Give user positive risk adjustment
      if (ad.userId) {
        await addRiskPoints(String(ad.userId), RISK_POINTS.APPROVED_AFTER_REVIEW, "APPROVED_AFTER_REVIEW", `Ad ${adId} approved by admin`);
      }
      break;

    case "reject":
      newStatus = "rejected";
      adStatus = "rejected";
      // Increase user risk
      if (ad.userId) {
        await addRiskPoints(String(ad.userId), RISK_POINTS.AD_REJECTED, "AD_REJECTED_BY_ADMIN", `Ad ${adId} rejected`);
        await User.findByIdAndUpdate(ad.userId, { $inc: { adsRejectedCount: 1 } });
      }
      break;

    case "suspend":
      newStatus = "suspended";
      adStatus = "hidden";
      // Significant risk increase
      if (ad.userId) {
        await addRiskPoints(String(ad.userId), 30, "AD_SUSPENDED", `Ad ${adId} suspended by admin`);
      }
      break;

    case "investigate":
      newStatus = "under_investigation";
      // Lock editing and boosts
      break;

    case "unflag":
      newStatus = "pending_review";
      break;

    default:
      throw new Error(`Unknown moderation action: ${action}`);
  }

  // Update ad
  const updateData: any = {
    moderationStatus: newStatus,
    status: adStatus,
    moderationReviewedBy: new mongoose.Types.ObjectId(adminId),
    moderationReviewedAt: new Date(),
  };
  if (note) updateData.moderationNote = note;
  if (rejectionReason) updateData.rejectionReason = rejectionReason;

  await Ad.findByIdAndUpdate(adId, { $set: updateData });

  // Audit log with full context
  const auditActionMap: Record<string, any> = {
    approve: "AD_APPROVED",
    reject: "AD_REJECTED",
    suspend: "AD_SUSPENDED",
    investigate: "AD_UNDER_INVESTIGATION",
    unflag: "AD_UNFLAGGED",
  };

  await AuditLog.log(auditActionMap[action], {
    adId: new mongoose.Types.ObjectId(adId),
    adminId: new mongoose.Types.ObjectId(adminId),
    userId: ad.userId,
    severity: action === "suspend" ? "critical" : action === "reject" ? "warning" : "info",
    previousValue: { moderationStatus: previousStatus, status: ad.status },
    newValue: { moderationStatus: newStatus, status: adStatus },
    reason: note || `Admin ${action}: ${rejectionReason || ""}`,
  });

  // Recalculate user risk after admin action  
  if (ad.userId && (action === "reject" || action === "suspend")) {
    await recalculateUserRisk(String(ad.userId), { trigger: `admin_${action}` }).catch(err =>
      logError("Risk recalc failed after admin action", err)
    );
  }

  logInfo("Admin moderation action", {
    adId,
    adminId,
    action,
    previousStatus,
    newStatus,
  });

  return {
    success: true,
    moderationStatus: newStatus,
    message: `Ad ${action}d successfully`,
  };
}

// ============================================
// VALID STATE TRANSITIONS
// ============================================

const VALID_TRANSITIONS: Record<ModerationStatus, ModerationStatus[]> = {
  pending_review: ["auto_approved", "approved", "flagged", "rejected", "suspended"],
  auto_approved: ["flagged", "suspended", "rejected"],
  approved: ["flagged", "under_investigation", "suspended", "rejected"],
  flagged: ["approved", "rejected", "under_investigation", "suspended", "pending_review"],
  under_investigation: ["approved", "rejected", "suspended"],
  rejected: ["pending_review"],  // Can re-submit
  suspended: ["pending_review", "rejected"],
};

/**
 * Check if a moderation state transition is valid
 */
export function isValidTransition(from: ModerationStatus, to: ModerationStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export default {
  moderateNewAd,
  rescanAd,
  adminModerateAd,
  isValidTransition,
};
