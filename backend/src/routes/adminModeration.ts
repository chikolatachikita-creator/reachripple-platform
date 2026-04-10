/**
 * Admin Moderation Routes
 *
 * Provides the admin moderation queue, moderation actions, and risk user management.
 *
 * Routes:
 *   GET  /api/admin/moderation/queue         - Get moderation queue (pending/flagged ads)
 *   GET  /api/admin/moderation/risk-users     - Get high/critical risk users
 *   GET  /api/admin/moderation/stats          - Get moderation statistics
 *   PATCH /api/admin/moderation/:id/moderate  - Take moderation action on an ad
 *   POST /api/admin/moderation/scan           - Trigger manual pattern scan
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import Ad from "../../models/Ad";
import User from "../../models/User";
import { AuditLog } from "../../models/AuditLog";
import AdminLog from "../../models/AdminLog";
import { adminModerateAd, isValidTransition } from "../../services/moderationService";
import { recalculateUserRisk } from "../../services/riskScoringService";
import { runPatternScan } from "../../services/patternDetectionService";
import { RiskProfile } from "../../models/RiskProfile";
import logger from "../../utils/logger";

const router = Router();

// ──────────────────────────────────────────
// GET /queue — Moderation queue
// ──────────────────────────────────────────
router.get("/queue", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status as string;

    // Default: show flagged + pending_review + under_investigation
    const validStatuses = ["pending_review", "flagged", "under_investigation", "suspended", "rejected"];
    const statuses = statusFilter && validStatuses.includes(statusFilter)
      ? [statusFilter]
      : ["flagged", "pending_review", "under_investigation"];

    const [ads, total] = await Promise.all([
      Ad.find({ moderationStatus: { $in: statuses } })
        .populate("userId", "name email idVerificationStatus status accountTier")
        .populate("moderationReviewedBy", "name email")
        .select("title images moderationStatus moderationScore moderationFlags moderationNote moderationReviewedAt status phone location createdAt userId")
        .sort({ moderationScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ad.countDocuments({ moderationStatus: { $in: statuses } }),
    ]);

    // Count by status for tabs
    const statusCounts = await Ad.aggregate([
      { $match: { moderationStatus: { $in: validStatuses } } },
      { $group: { _id: "$moderationStatus", count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    for (const sc of statusCounts) {
      counts[sc._id] = sc.count;
    }

    return res.json({
      ads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      statusCounts: counts,
    });
  } catch (err: any) {
    logger.error("Failed to load moderation queue:", err);
    return res.status(500).json({ error: "Failed to load moderation queue" });
  }
});

// ──────────────────────────────────────────
// PATCH /:id/moderate — Take moderation action
// ──────────────────────────────────────────
router.patch("/:id/moderate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, note, rejectionReason } = req.body;
    const adminId = (req as any).userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ad ID" });
    }

    const validActions = ["approve", "reject", "suspend", "investigate", "unflag"];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${validActions.join(", ")}`,
      });
    }

    // Check current ad state for valid transition
    const currentAd = await Ad.findById(id).select("moderationStatus");
    if (!currentAd) {
      return res.status(404).json({ error: "Ad not found" });
    }

    const result = await adminModerateAd({
      adId: id,
      adminId,
      action,
      note,
      rejectionReason,
    });

    // Admin log for audit trail
    const adminActionMap: Record<string, string> = {
      approve: "MODERATION_APPROVE",
      reject: "MODERATION_REJECT",
      suspend: "MODERATION_SUSPEND",
      investigate: "MODERATION_INVESTIGATE",
      unflag: "MODERATION_UNFLAG",
    };
    await AdminLog.logAction({
      adminId,
      adminEmail: (req as any).userEmail || "admin",
      action: (adminActionMap[action] || "MODERATION_APPROVE") as any,
      targetType: "ad",
      targetId: new mongoose.Types.ObjectId(id),
      description: `Moderation ${action}: ${note || rejectionReason || "No notes"}`,
    });

    return res.json(result);
  } catch (err: any) {
    logger.error("Moderation action failed:", err);
    return res.status(500).json({ error: err.message || "Moderation action failed" });
  }
});

// ──────────────────────────────────────────
// GET /risk-users — High/critical risk users
// ──────────────────────────────────────────
router.get("/risk-users", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const levelFilter = req.query.level as string;

    const query: any = {};
    if (levelFilter && ["low", "medium", "high", "critical"].includes(levelFilter)) {
      query.riskLevel = levelFilter;
    } else {
      // Default: show medium + high + critical
      query.riskLevel = { $in: ["medium", "high", "critical"] };
    }

    // Query RiskProfile collection instead of User
    const [riskProfiles, total] = await Promise.all([
      RiskProfile.find(query)
        .sort({ riskScore: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RiskProfile.countDocuments(query),
    ]);

    // Hydrate with user data
    const userIds = riskProfiles.map((rp: any) => rp.userId);
    const usersMap = new Map();
    const userDocs = await User.find({ _id: { $in: userIds } })
      .select("+adsRejectedCount +totalAdsPosted")
      .select("name email role idVerificationStatus status createdAt")
      .lean();
    for (const u of userDocs) {
      usersMap.set(String(u._id), u);
    }

    const users = riskProfiles.map((rp: any) => {
      const u = usersMap.get(String(rp.userId)) || {};
      return {
        ...u,
        riskScore: rp.riskScore,
        riskLevel: rp.riskLevel,
        isUnderReview: rp.isUnderReview,
      };
    });

    // Count by risk level
    const levelCounts = await RiskProfile.aggregate([
      { $match: { riskLevel: { $in: ["low", "medium", "high", "critical"] } } },
      { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    for (const lc of levelCounts) {
      counts[lc._id] = lc.count;
    }

    return res.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      riskLevelCounts: counts,
    });
  } catch (err: any) {
    logger.error("Failed to load risk users:", err);
    return res.status(500).json({ error: "Failed to load risk users" });
  }
});

// ──────────────────────────────────────────
// GET /stats — Moderation statistics
// ──────────────────────────────────────────
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const [moderationStats, riskStats, recentActions] = await Promise.all([
      // Ad moderation status breakdown
      Ad.aggregate([
        {
          $group: {
            _id: "$moderationStatus",
            count: { $sum: 1 },
            avgScore: { $avg: "$moderationScore" },
          },
        },
      ]),

      // User risk level breakdown (from RiskProfile)
      RiskProfile.aggregate([
        { $match: { riskLevel: { $exists: true } } },
        {
          $group: {
            _id: "$riskLevel",
            count: { $sum: 1 },
            avgRiskScore: { $avg: "$riskScore" },
          },
        },
      ]),

      // Recent moderation audit events (last 50)
      AuditLog.find({
        action: {
          $in: [
            "AD_APPROVED", "AD_REJECTED", "AD_SUSPENDED",
            "AD_AUTO_APPROVED", "AD_FLAGGED", "AD_UNDER_INVESTIGATION",
            "RED_FLAG_DETECTED", "PATTERN_DETECTED",
          ],
        },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    // Calculate key metrics
    const moderationMap: Record<string, any> = {};
    for (const ms of moderationStats) {
      moderationMap[ms._id || "unknown"] = { count: ms.count, avgScore: Math.round(ms.avgScore || 0) };
    }

    const riskMap: Record<string, any> = {};
    for (const rs of riskStats) {
      riskMap[rs._id || "unknown"] = { count: rs.count, avgRiskScore: Math.round(rs.avgRiskScore || 0) };
    }

    return res.json({
      moderation: moderationMap,
      riskLevels: riskMap,
      recentActions,
      queueSize:
        (moderationMap.flagged?.count || 0) +
        (moderationMap.pending_review?.count || 0) +
        (moderationMap.under_investigation?.count || 0),
    });
  } catch (err: any) {
    logger.error("Failed to load moderation stats:", err);
    return res.status(500).json({ error: "Failed to load moderation stats" });
  }
});

// ──────────────────────────────────────────
// POST /scan — Manual pattern scan trigger
// ──────────────────────────────────────────
router.post("/scan", async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId;

    // Log admin trigger
    await AdminLog.logAction({
      adminId,
      adminEmail: (req as any).userEmail || "admin",
      action: "MANUAL_PATTERN_SCAN",
      targetType: "system",
      description: "Admin triggered manual pattern scan",
    });

    // Run scan (may take a while)
    const report = await runPatternScan();

    return res.json({
      message: "Pattern scan completed",
      report,
    });
  } catch (err: any) {
    logger.error("Manual pattern scan failed:", err);
    return res.status(500).json({ error: "Pattern scan failed" });
  }
});

// ──────────────────────────────────────────
// POST /recalculate-risk/:userId — Recalc user risk
// ──────────────────────────────────────────
router.post("/recalculate-risk/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await recalculateUserRisk(userId, { trigger: "admin_manual" });
    return res.json({ message: "Risk recalculated", ...result });
  } catch (err: any) {
    logger.error("Risk recalculation failed:", err);
    return res.status(500).json({ error: err.message || "Risk recalculation failed" });
  }
});

export default router;
