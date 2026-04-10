/**
 * Risk Scoring Service
 * 
 * Calculates and maintains risk scores for advertisers.
 * Determines risk level and enforcement actions.
 * 
 * Risk Score Formula:
 *   Event-based points accumulated, then clamped to 0-100.
 *   Risk level derived from score thresholds.
 */

import mongoose from "mongoose";
import User, { UserDocument } from "../models/User";
import { RiskProfile } from "../models/RiskProfile";
import Ad from "../models/Ad";
import Report from "../models/Report";
import { AuditLog } from "../models/AuditLog";
import { logInfo, logWarn, logError } from "../utils/logger";

// ============================================
// RISK SCORE POINT VALUES
// ============================================

export const RISK_POINTS = {
  // Positive risk (increases score)
  NEW_ACCOUNT: 5,
  REPORT_RECEIVED: 10,
  UNDER_18_REPORT: 40,
  EXPLOITATION_REPORT: 50,
  PHONE_REUSE: 30,
  CITY_HOP_FREQUENT: 20,
  AD_REJECTED: 15,
  IMAGE_REUSE_CROSS_ACCOUNT: 25,
  RED_FLAG_TEXT: 20,
  RAPID_POSTING: 10,
  MULTIPLE_REJECTIONS: 25,

  // Negative risk (decreases score)
  APPROVED_AFTER_REVIEW: -5,
  VERIFIED_ADVERTISER: -20,
  LONG_STANDING_ACCOUNT: -10, // > 90 days
  CLEAN_RECORD_30_DAYS: -5,
} as const;

// ============================================
// RISK LEVEL THRESHOLDS
// ============================================

export type RiskLevel = "low" | "medium" | "high" | "critical";

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

// ============================================
// RISK ENFORCEMENT RULES
// ============================================

export interface RiskEnforcement {
  level: RiskLevel;
  requiresModeration: boolean;      // Ads go through manual moderation
  requiresPreModeration: boolean;   // Ads held until admin approves
  autoSuspend: boolean;             // Account auto-suspended
  description: string;
}

export function getEnforcementRules(level: RiskLevel): RiskEnforcement {
  switch (level) {
    case "low":
      return {
        level: "low",
        requiresModeration: false,
        requiresPreModeration: false,
        autoSuspend: false,
        description: "Normal — ads auto-approved if clean",
      };
    case "medium":
      return {
        level: "medium",
        requiresModeration: true,
        requiresPreModeration: false,
        autoSuspend: false,
        description: "Manual moderation — ads reviewed before going live",
      };
    case "high":
      return {
        level: "high",
        requiresModeration: true,
        requiresPreModeration: true,
        autoSuspend: false,
        description: "Pre-moderation required — ads held until admin approves",
      };
    case "critical":
      return {
        level: "critical",
        requiresModeration: true,
        requiresPreModeration: true,
        autoSuspend: true,
        description: "Account suspension — immediate action required",
      };
  }
}

// ============================================
// RISK SCORE CALCULATION
// ============================================

export interface RiskCalculationResult {
  score: number;
  level: RiskLevel;
  factors: { event: string; points: number; detail?: string }[];
  enforcement: RiskEnforcement;
  previousScore: number;
  previousLevel: RiskLevel;
}

/**
 * Full recalculation of a user's risk score from all signals.
 * Writes the result to the User document and logs the change.
 */
export async function recalculateUserRisk(
  userId: string | mongoose.Types.ObjectId,
  options: { ip?: string; trigger?: string } = {}
): Promise<RiskCalculationResult> {
  const user = await User.findById(userId).select(
    "+totalAdsPosted +adsRejectedCount +reportsReceivedCount"
  );
  if (!user) throw new Error(`User ${userId} not found`);

  const riskProfile = await RiskProfile.getOrCreate(String(userId));
  const previousScore = riskProfile.riskScore || 0;
  const previousLevel = (riskProfile.riskLevel as RiskLevel) || "low";

  let score = 0;
  const factors: RiskCalculationResult["factors"] = [];

  // --- 1. Account age ---
  const accountAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < 7) {
    score += RISK_POINTS.NEW_ACCOUNT;
    factors.push({ event: "NEW_ACCOUNT", points: RISK_POINTS.NEW_ACCOUNT, detail: `Account ${Math.round(accountAgeDays)} days old` });
  }
  if (accountAgeDays > 90) {
    score += RISK_POINTS.LONG_STANDING_ACCOUNT;
    factors.push({ event: "LONG_STANDING_ACCOUNT", points: RISK_POINTS.LONG_STANDING_ACCOUNT });
  }

  // --- 2. Verified advertiser ---
  if (user.idVerificationStatus === "verified") {
    score += RISK_POINTS.VERIFIED_ADVERTISER;
    factors.push({ event: "VERIFIED_ADVERTISER", points: RISK_POINTS.VERIFIED_ADVERTISER });
  }

  // --- 3. Reports received ---
  const reportCount = user.reportsReceivedCount || 0;
  if (reportCount > 0) {
    // Check severity of reports
    const severeReports = await Report.countDocuments({
      adId: { $in: await Ad.find({ userId }).distinct("_id") },
      reason: { $regex: /under.?18|exploitation|trafficking/i },
    });

    const normalReportPoints = (reportCount - severeReports) * RISK_POINTS.REPORT_RECEIVED;
    if (normalReportPoints > 0) {
      score += normalReportPoints;
      factors.push({ event: "REPORTS_RECEIVED", points: normalReportPoints, detail: `${reportCount - severeReports} standard reports` });
    }

    if (severeReports > 0) {
      // Under-18 and exploitation reports carry MUCH higher weight
      const severePoints = severeReports * RISK_POINTS.EXPLOITATION_REPORT;
      score += severePoints;
      factors.push({ event: "SEVERE_REPORTS", points: severePoints, detail: `${severeReports} severe reports (under-18/trafficking)` });
    }
  }

  // --- 4. Ad rejections ---
  const rejectedCount = user.adsRejectedCount || 0;
  if (rejectedCount > 0) {
    const rejectionPoints = rejectedCount * RISK_POINTS.AD_REJECTED;
    score += rejectionPoints;
    factors.push({ event: "AD_REJECTIONS", points: rejectionPoints, detail: `${rejectedCount} ads rejected` });
  }
  if (rejectedCount >= 3) {
    score += RISK_POINTS.MULTIPLE_REJECTIONS;
    factors.push({ event: "MULTIPLE_REJECTIONS", points: RISK_POINTS.MULTIPLE_REJECTIONS });
  }

  // --- 5. Phone reuse across accounts ---
  if (user.phone) {
    const phoneUsers = await User.countDocuments({
      phone: user.phone,
      _id: { $ne: user._id },
      deleted: { $ne: true },
    });
    if (phoneUsers >= 1) {
      score += RISK_POINTS.PHONE_REUSE;
      factors.push({ event: "PHONE_REUSE", points: RISK_POINTS.PHONE_REUSE, detail: `Phone shared with ${phoneUsers} other account(s)` });
    }
  }

  // --- 6. City hopping (many location changes in 7 days) ---
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentCityChanges = await Ad.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
    { $unwind: "$locationHistory" },
    { $match: { "locationHistory.changedAt": { $gte: sevenDaysAgo } } },
    { $group: { _id: "$locationHistory.city" } },
    { $count: "cities" },
  ]);
  const uniqueCities = recentCityChanges[0]?.cities || 0;
  if (uniqueCities >= 3) {
    score += RISK_POINTS.CITY_HOP_FREQUENT;
    factors.push({ event: "CITY_HOP_FREQUENT", points: RISK_POINTS.CITY_HOP_FREQUENT, detail: `${uniqueCities} cities in 7 days` });
  }

  // --- 7. Clean record bonus ---
  const recentReports = await Report.countDocuments({
    adId: { $in: await Ad.find({ userId }).distinct("_id") },
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  });
  if (recentReports === 0 && accountAgeDays > 30) {
    score += RISK_POINTS.CLEAN_RECORD_30_DAYS;
    factors.push({ event: "CLEAN_RECORD_30_DAYS", points: RISK_POINTS.CLEAN_RECORD_30_DAYS });
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  const level = getRiskLevel(score);
  const enforcement = getEnforcementRules(level);

  // --- Update RiskProfile ---
  const updateFields: any = { riskScore: score, riskLevel: level, lastCalculatedAt: new Date() };

  // Auto-suspend critical risk accounts
  if (enforcement.autoSuspend && user.status === "active") {
    await User.findByIdAndUpdate(userId, { $set: { status: "suspended" } });
    updateFields.isUnderReview = true;
    logWarn("Auto-suspending critical risk user", {
      userId: String(userId),
      score,
      factors: factors.map(f => f.event),
    });
  }

  // Mark for review if high risk
  if (level === "high" || level === "critical") {
    updateFields.isUnderReview = true;
  }

  await RiskProfile.findOneAndUpdate(
    { userId },
    { $set: updateFields },
    { upsert: true }
  );

  // --- Audit log ---
  if (score !== previousScore) {
    await AuditLog.log("RISK_SCORE_CHANGED", {
      userId: new mongoose.Types.ObjectId(String(userId)),
      severity: level === "critical" ? "critical" : level === "high" ? "warning" : "info",
      previousValue: { score: previousScore, level: previousLevel },
      newValue: { score, level },
      metadata: { factors, trigger: options.trigger },
      ip: options.ip,
      reason: `Risk score: ${previousScore} → ${score} (${previousLevel} → ${level})`,
    });
  }

  return {
    score,
    level,
    factors,
    enforcement,
    previousScore,
    previousLevel,
  };
}

/**
 * Add risk points for a specific event (incremental, non-recalculating).
 * Use for quick adjustments; full recalculation runs nightly.
 */
export async function addRiskPoints(
  userId: string | mongoose.Types.ObjectId,
  points: number,
  event: string,
  detail?: string
): Promise<{ score: number; level: RiskLevel }> {
  const riskProfile = await RiskProfile.getOrCreate(String(userId));

  const oldScore = riskProfile.riskScore || 0;
  const newScore = Math.max(0, Math.min(100, oldScore + points));
  const newLevel = getRiskLevel(newScore);

  await RiskProfile.findOneAndUpdate(
    { userId },
    { $set: { riskScore: newScore, riskLevel: newLevel, lastCalculatedAt: new Date() } },
    { upsert: true }
  );

  logInfo("Risk points added", {
    userId: String(userId),
    event,
    points,
    oldScore,
    newScore,
    newLevel,
    detail,
  });

  return { score: newScore, level: newLevel };
}

export default {
  recalculateUserRisk,
  addRiskPoints,
  getRiskLevel,
  getEnforcementRules,
  RISK_POINTS,
};
