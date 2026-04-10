/**
 * Pattern Detection Service (Anti-Trafficking)
 *
 * Runs pattern-based analysis across advertisers to detect:
 * - Phone reuse across accounts with different names
 * - Same images across cities / accounts
 * - City hopping every 2-3 days
 * - Report cluster density
 * - Template-structured ads (identical description patterns)
 *
 * Designed to run as a nightly cron job.
 */

import mongoose from "mongoose";
import Ad from "../models/Ad";
import User from "../models/User";
import { RiskProfile } from "../models/RiskProfile";
import Report from "../models/Report";
import { AuditLog } from "../models/AuditLog";
import { addRiskPoints, RISK_POINTS, getRiskLevel } from "./riskScoringService";
import { logInfo, logWarn, logError } from "../utils/logger";

// ============================================
// PATTERN THRESHOLDS
// ============================================

const THRESHOLDS = {
  CITY_HOP_DAYS: 7,              // Window for city-hop detection
  CITY_HOP_MIN_CITIES: 3,       // Minimum unique cities to flag
  PHONE_REUSE_MIN_ACCOUNTS: 2,  // Minimum accounts sharing a phone
  IMAGE_REUSE_MIN_MATCHES: 2,   // Minimum image hash matches across accounts
  REPORT_CLUSTER_DAYS: 14,      // Window for report cluster detection
  REPORT_CLUSTER_MIN: 3,        // Minimum reports to constitute a cluster
  TEMPLATE_SIMILARITY_THRESHOLD: 0.85, // Jaccard similarity threshold
} as const;

// ============================================
// PATTERN: Phone Reuse Detection
// ============================================

interface PhoneReuseResult {
  phone: string;
  accounts: { userId: string; name: string; email: string }[];
}

async function detectPhoneReuse(): Promise<PhoneReuseResult[]> {
  const results = await User.aggregate([
    { $match: { phone: { $exists: true, $nin: [null, ""] }, deleted: { $ne: true } } },
    { $group: { _id: "$phone", count: { $sum: 1 }, accounts: { $push: { userId: "$_id", name: "$name", email: "$email" } } } },
    { $match: { count: { $gte: THRESHOLDS.PHONE_REUSE_MIN_ACCOUNTS } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  return results.map((r: any) => ({
    phone: r._id,
    accounts: r.accounts.map((a: any) => ({
      userId: String(a.userId),
      name: a.name,
      email: a.email,
    })),
  }));
}

// ============================================
// PATTERN: Image Reuse Across Accounts
// ============================================

interface ImageReuseResult {
  hash: string;
  ads: { adId: string; userId: string; title: string }[];
}

async function detectImageReuse(): Promise<ImageReuseResult[]> {
  const results = await Ad.aggregate([
    { $match: { isDeleted: { $ne: true }, imageHashes: { $exists: true, $ne: [] } } },
    { $unwind: "$imageHashes" },
    { $group: {
      _id: "$imageHashes",
      count: { $sum: 1 },
      ads: { $push: { adId: "$_id", userId: "$userId", title: "$title" } },
      uniqueUsers: { $addToSet: "$userId" },
    }},
    { $addFields: { userCount: { $size: "$uniqueUsers" } } },
    { $match: { userCount: { $gte: THRESHOLDS.IMAGE_REUSE_MIN_MATCHES } } },
    { $sort: { userCount: -1 } },
    { $limit: 50 },
  ]);

  return results.map((r: any) => ({
    hash: r._id,
    ads: r.ads.map((a: any) => ({
      adId: String(a.adId),
      userId: String(a.userId),
      title: a.title,
    })),
  }));
}

// ============================================
// PATTERN: City Hopping
// ============================================

interface CityHopResult {
  userId: string;
  cities: string[];
  changeCount: number;
}

async function detectCityHopping(): Promise<CityHopResult[]> {
  const since = new Date(Date.now() - THRESHOLDS.CITY_HOP_DAYS * 24 * 60 * 60 * 1000);

  const results = await Ad.aggregate([
    { $match: { isDeleted: { $ne: true }, "locationHistory.changedAt": { $gte: since } } },
    { $unwind: "$locationHistory" },
    { $match: { "locationHistory.changedAt": { $gte: since } } },
    { $group: {
      _id: "$userId",
      cities: { $addToSet: "$locationHistory.city" },
      changeCount: { $sum: 1 },
    }},
    { $addFields: { cityCount: { $size: "$cities" } } },
    { $match: { cityCount: { $gte: THRESHOLDS.CITY_HOP_MIN_CITIES } } },
    { $sort: { cityCount: -1 } },
    { $limit: 50 },
  ]);

  return results.map((r: any) => ({
    userId: String(r._id),
    cities: r.cities,
    changeCount: r.changeCount,
  }));
}

// ============================================
// PATTERN: Report Cluster Density
// ============================================

interface ReportClusterResult {
  userId: string;
  reportCount: number;
  severeCount: number;
  reasons: string[];
}

async function detectReportClusters(): Promise<ReportClusterResult[]> {
  const since = new Date(Date.now() - THRESHOLDS.REPORT_CLUSTER_DAYS * 24 * 60 * 60 * 1000);

  // Get ads grouped by user, then count reports per user
  const results = await Report.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $lookup: { from: "ads", localField: "adId", foreignField: "_id", as: "ad" } },
    { $unwind: "$ad" },
    { $group: {
      _id: "$ad.userId",
      reportCount: { $sum: 1 },
      reasons: { $push: "$reason" },
    }},
    { $match: { reportCount: { $gte: THRESHOLDS.REPORT_CLUSTER_MIN } } },
    { $sort: { reportCount: -1 } },
    { $limit: 50 },
  ]);

  return results.map((r: any) => {
    const reasons: string[] = r.reasons;
    const severeCount = reasons.filter((reason: string) =>
      /under.?18|exploitation|trafficking/i.test(reason)
    ).length;

    return {
      userId: String(r._id),
      reportCount: r.reportCount,
      severeCount,
      reasons: [...new Set(reasons)],
    };
  });
}

// ============================================
// PATTERN: Template Ad Detection (Jaccard similarity)
// ============================================

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

interface TemplatePair {
  adId1: string;
  userId1: string;
  adId2: string;
  userId2: string;
  similarity: number;
}

async function detectTemplateAds(): Promise<TemplatePair[]> {
  // Get recent ads from different users
  const ads = await Ad.find({
    isDeleted: { $ne: true },
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  })
    .select("_id userId description")
    .lean()
    .limit(500);

  const pairs: TemplatePair[] = [];

  // Compare ads from different users
  for (let i = 0; i < ads.length; i++) {
    for (let j = i + 1; j < ads.length; j++) {
      // Only compare ads from different users
      if (String(ads[i].userId) === String(ads[j].userId)) continue;

      const tokensA = tokenize(ads[i].description || "");
      const tokensB = tokenize(ads[j].description || "");

      // Skip very short descriptions
      if (tokensA.size < 10 || tokensB.size < 10) continue;

      const sim = jaccardSimilarity(tokensA, tokensB);
      if (sim >= THRESHOLDS.TEMPLATE_SIMILARITY_THRESHOLD) {
        pairs.push({
          adId1: String(ads[i]._id),
          userId1: String(ads[i].userId),
          adId2: String(ads[j]._id),
          userId2: String(ads[j].userId),
          similarity: Math.round(sim * 100) / 100,
        });
      }

      // Limit pairwise comparisons
      if (pairs.length >= 20) break;
    }
    if (pairs.length >= 20) break;
  }

  return pairs;
}

// ============================================
// NIGHTLY PATTERN SCAN (main entry point)
// ============================================

export interface PatternScanReport {
  startedAt: Date;
  completedAt: Date;
  phoneReuse: PhoneReuseResult[];
  imageReuse: ImageReuseResult[];
  cityHoppers: CityHopResult[];
  reportClusters: ReportClusterResult[];
  templatePairs: TemplatePair[];
  usersAffected: number;
  riskAdjustments: number;
}

/**
 * Run all pattern detection checks.
 * Called by nightly cron job. Logs results and adjusts risk scores.
 */
export async function runPatternScan(): Promise<PatternScanReport> {
  const startedAt = new Date();
  logInfo("Pattern detection scan started");

  const affectedUserIds = new Set<string>();
  let riskAdjustments = 0;

  // Run all pattern checks in parallel
  const [phoneReuse, imageReuse, cityHoppers, reportClusters, templatePairs] = await Promise.all([
    detectPhoneReuse().catch(err => { logError("Phone reuse detection failed", err); return [] as PhoneReuseResult[]; }),
    detectImageReuse().catch(err => { logError("Image reuse detection failed", err); return [] as ImageReuseResult[]; }),
    detectCityHopping().catch(err => { logError("City hop detection failed", err); return [] as CityHopResult[]; }),
    detectReportClusters().catch(err => { logError("Report cluster detection failed", err); return [] as ReportClusterResult[]; }),
    detectTemplateAds().catch(err => { logError("Template ad detection failed", err); return [] as TemplatePair[]; }),
  ]);

  // Process Phone Reuse
  for (const pr of phoneReuse) {
    for (const account of pr.accounts) {
      affectedUserIds.add(account.userId);
      try {
        await addRiskPoints(account.userId, RISK_POINTS.PHONE_REUSE, "PHONE_REUSE", `Phone ${pr.phone.slice(-4)} shared with ${pr.accounts.length} accounts`);
        riskAdjustments++;
        await AuditLog.log("PHONE_REUSE_DETECTED", {
          userId: new mongoose.Types.ObjectId(account.userId),
          severity: "warning",
          isSystem: true,
          metadata: { phone: pr.phone.slice(-4), sharedWith: pr.accounts.length },
          reason: `Phone shared across ${pr.accounts.length} accounts`,
        });
      } catch (err: any) {
        logError("Failed to process phone reuse", err);
      }
    }
  }

  // Process Image Reuse
  const imageReuseUsers = new Set<string>();
  for (const ir of imageReuse) {
    for (const ad of ir.ads) {
      if (!imageReuseUsers.has(ad.userId)) {
        imageReuseUsers.add(ad.userId);
        affectedUserIds.add(ad.userId);
        try {
          await addRiskPoints(ad.userId, RISK_POINTS.IMAGE_REUSE_CROSS_ACCOUNT, "IMAGE_REUSE", `Image reused across ${ir.ads.length} ads from different accounts`);
          riskAdjustments++;
          await AuditLog.log("IMAGE_REUSE_DETECTED", {
            userId: new mongoose.Types.ObjectId(ad.userId),
            adId: new mongoose.Types.ObjectId(ad.adId),
            severity: "warning",
            isSystem: true,
            metadata: { hash: ir.hash, matchCount: ir.ads.length },
            reason: `Same image used across ${ir.ads.length} ads from different accounts`,
          });
        } catch (err: any) {
          logError("Failed to process image reuse", err);
        }
      }
    }
  }

  // Process City Hoppers
  for (const ch of cityHoppers) {
    affectedUserIds.add(ch.userId);
    try {
      await addRiskPoints(ch.userId, RISK_POINTS.CITY_HOP_FREQUENT, "CITY_HOP", `${ch.cities.length} cities in 7 days`);
      riskAdjustments++;
      await AuditLog.log("CITY_HOP_DETECTED", {
        userId: new mongoose.Types.ObjectId(ch.userId),
        severity: "warning",
        isSystem: true,
        metadata: { cities: ch.cities, changeCount: ch.changeCount },
        reason: `City hopping: ${ch.cities.length} cities in ${THRESHOLDS.CITY_HOP_DAYS} days`,
      });
    } catch (err: any) {
      logError("Failed to process city hop", err);
    }
  }

  // Process Report Clusters
  for (const rc of reportClusters) {
    affectedUserIds.add(rc.userId);
    if (rc.severeCount > 0) {
      try {
        await addRiskPoints(rc.userId, rc.severeCount * RISK_POINTS.EXPLOITATION_REPORT, "REPORT_CLUSTER_SEVERE", `${rc.severeCount} severe reports`);
        riskAdjustments++;
      } catch (err: any) {
        logError("Failed to process report cluster", err);
      }
    }
    try {
      await AuditLog.log("PATTERN_DETECTED", {
        userId: new mongoose.Types.ObjectId(rc.userId),
        severity: rc.severeCount > 0 ? "critical" : "warning",
        isSystem: true,
        metadata: { reportCount: rc.reportCount, severeCount: rc.severeCount, reasons: rc.reasons },
        reason: `Report cluster: ${rc.reportCount} reports in ${THRESHOLDS.REPORT_CLUSTER_DAYS} days`,
      });
    } catch (err: any) {
      logError("Failed to log report cluster", err);
    }
  }

  // Process Template Pairs
  const templateUsers = new Set<string>();
  for (const tp of templatePairs) {
    for (const uid of [tp.userId1, tp.userId2]) {
      if (!templateUsers.has(uid)) {
        templateUsers.add(uid);
        affectedUserIds.add(uid);
        try {
          await addRiskPoints(uid, 15, "TEMPLATE_AD", `Ad description ${tp.similarity * 100}% similar to another account's ad`);
          riskAdjustments++;
          await AuditLog.log("PATTERN_DETECTED", {
            userId: new mongoose.Types.ObjectId(uid),
            severity: "warning",
            isSystem: true,
            metadata: { similarity: tp.similarity, pairedAdId: uid === tp.userId1 ? tp.adId2 : tp.adId1 },
            reason: `Template ad detected: ${Math.round(tp.similarity * 100)}% similar`,
          });
        } catch (err: any) {
          logError("Failed to process template pair", err);
        }
      }
    }
  }

  // Flag users that crossed into high/critical
  for (const uid of affectedUserIds) {
    try {
      const riskProfile = await RiskProfile.getOrCreate(uid);
      const level = getRiskLevel(riskProfile.riskScore);
      if ((level === "high" || level === "critical") && !riskProfile.isUnderReview) {
        await RiskProfile.findOneAndUpdate(
          { userId: uid },
          { $set: { isUnderReview: true, riskLevel: level } }
        );
        logWarn("User flagged for review by pattern scan", { userId: uid, riskScore: riskProfile.riskScore, level });
      }
    } catch (err: any) {
      logError("Failed to check user risk level", err);
    }
  }

  const completedAt = new Date();
  const report: PatternScanReport = {
    startedAt,
    completedAt,
    phoneReuse,
    imageReuse,
    cityHoppers,
    reportClusters,
    templatePairs,
    usersAffected: affectedUserIds.size,
    riskAdjustments,
  };

  logInfo("Pattern detection scan completed", {
    durationMs: completedAt.getTime() - startedAt.getTime(),
    phoneReuse: phoneReuse.length,
    imageReuse: imageReuse.length,
    cityHoppers: cityHoppers.length,
    reportClusters: reportClusters.length,
    templatePairs: templatePairs.length,
    usersAffected: affectedUserIds.size,
    riskAdjustments,
  });

  return report;
}

export default {
  runPatternScan,
  detectPhoneReuse,
  detectImageReuse,
  detectCityHopping,
  detectReportClusters,
  detectTemplateAds,
};
