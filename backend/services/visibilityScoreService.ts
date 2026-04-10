/**
 * Visibility Score Service
 *
 * Computes a composite visibility score for each ad using multiplicative scoring.
 * Formula: 1000 × Quality × Trust × Freshness × Engagement × TierMult × PlacementMult × Jitter
 *
 * Sub-multipliers:
 *   Quality     (0.7 – 1.3): images, description, profile completeness, pricing, videos
 *   Trust       (0.6 – 1.4): ID verification, email verified, account age, risk profile, reports
 *   Freshness   (0.7 – 1.3): decay from lastPulsedAt (bump system)
 *   Engagement  (0.8 – 1.5): weighted 7-day rolling event window
 *   TierMult    (0.85 – 1.45): based on user's account tier
 *   PlacementMult (1.0 – 1.45): based on ad's placement tier (STANDARD/PRIORITY/PRIORITY_PLUS/FEATURED)
 *   Jitter      (±2%): randomization to prevent identical scores blocking each other
 *
 * Called by a 30-minute cron job to refresh all active ad scores.
 */

import mongoose from "mongoose";
import Ad, { AdDocument, PlacementTier } from "../models/Ad";
import User from "../models/User";
import { RiskProfile } from "../models/RiskProfile";
import { logInfo, logError } from "../utils/logger";

// ============================================
// TIER MULTIPLIER MAPS
// ============================================

const ACCOUNT_TIER_MULT: Record<string, number> = {
  free: 0.85,
  standard: 1.0,
  prime: 1.2,
  spotlight: 1.45,
};

const PLACEMENT_TIER_MULT: Record<PlacementTier, number> = {
  STANDARD: 1.0,
  PRIORITY: 1.1,
  PRIORITY_PLUS: 1.2,
  FEATURED: 1.45,
};

// Engagement event weights
const EVENT_WEIGHT: Record<string, number> = {
  view: 1,
  save: 6,
  wa_click: 8,
  call_click: 8,
  sms_click: 6,
  message_started: 10,
  share: 4,
};

const SMALL_SAMPLE_CAP = 60; // Minimum events to remove small-sample cap

// ============================================
// SUB-MULTIPLIER FUNCTIONS
// ============================================

/**
 * Quality multiplier (0.7 – 1.3)
 * Based on images, description, profile fields, pricing, videos
 */
function computeQualityMultiplier(ad: AdDocument): number {
  let score = 0;

  // Images: 0-5 points (1 per image, max 5)
  const imageCount = (ad.images || []).length;
  score += Math.min(imageCount, 5);

  // Description length: 0-3 points
  const descLen = (ad.description || "").length;
  if (descLen >= 300) score += 3;
  else if (descLen >= 150) score += 2;
  else if (descLen >= 50) score += 1;

  // Profile fields: 0-4 points
  const pf = ad.profileFields;
  if (pf) {
    if (pf.location) score += 0.5;
    if (pf.type) score += 0.5;
    if (pf.gender) score += 0.5;
    if (pf.languages && pf.languages.length > 0) score += 0.5;
    if (pf.incall || pf.outcall) score += 0.5;
    if (pf.serviceFor && pf.serviceFor.length > 0) score += 0.5;
    if (pf.age) score += 0.5;
    if (pf.ethnicity) score += 0.5;
  }

  // Pricing: 0-2 points
  const pricing = ad.pricing;
  if (pricing) {
    let priceSlots = 0;
    if (pricing.price_15min) priceSlots++;
    if (pricing.price_30min) priceSlots++;
    if (pricing.price_1hour) priceSlots++;
    if (pricing.price_2hours) priceSlots++;
    if (pricing.price_3hours) priceSlots++;
    if (pricing.price_overnight) priceSlots++;
    score += Math.min(priceSlots * 0.4, 2);
  }

  // Videos: 0-1 point
  if (ad.videos && ad.videos.length > 0) score += 1;

  // Services listed: 0-1 point
  if (ad.selectedServices && ad.selectedServices.length >= 3) score += 1;

  // Map 0-16 range to 0.7-1.3
  const maxPoints = 16;
  return 0.7 + (Math.min(score, maxPoints) / maxPoints) * 0.6;
}

/**
 * Trust multiplier (0.6 – 1.4)
 * Based on ID verification, email verification, account age, risk profile
 */
async function computeTrustMultiplier(ad: AdDocument): Promise<number> {
  let score = 0;

  if (!ad.userId) return 1.0;

  const user = await User.findById(ad.userId).select(
    "isVerified idVerificationStatus createdAt reportsReceivedCount adsRejectedCount"
  );
  if (!user) return 0.8;

  // ID Verification: +3 if verified
  if (user.idVerificationStatus === "verified") score += 3;

  // Email verified: +1
  if (user.isVerified) score += 1;

  // Account age bonus
  const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > 180) score += 2;
  else if (ageDays > 90) score += 1.5;
  else if (ageDays > 30) score += 1;
  else if (ageDays < 3) score -= 1; // Very new account penalty

  // Risk profile penalties
  const riskProfile = await RiskProfile.getOrCreate(String(ad.userId));
  if (riskProfile.riskLevel === "critical") score -= 4;
  else if (riskProfile.riskLevel === "high") score -= 2;
  else if (riskProfile.riskLevel === "medium") score -= 1;
  else if (riskProfile.riskLevel === "low" && riskProfile.riskScore <= 10) score += 1;

  // Reports penalty
  const reportCount = user.reportsReceivedCount || 0;
  if (reportCount >= 5) score -= 2;
  else if (reportCount >= 2) score -= 1;

  // Rejection penalty
  const rejections = user.adsRejectedCount || 0;
  if (rejections >= 3) score -= 2;
  else if (rejections >= 1) score -= 0.5;

  // Map -6 to +8 range to 0.6-1.4
  const clamped = Math.max(-6, Math.min(8, score));
  return 0.6 + ((clamped + 6) / 14) * 0.8;
}

/**
 * Freshness multiplier (0.7 – 1.3)
 * Based on time since last pulse/bump
 */
function computeFreshnessMultiplier(ad: AdDocument): number {
  const lastPulsed = ad.lastPulsedAt ? new Date(ad.lastPulsedAt).getTime() : new Date(ad.createdAt).getTime();
  const hoursSince = (Date.now() - lastPulsed) / (1000 * 60 * 60);

  if (hoursSince <= 2) return 1.3;
  if (hoursSince <= 6) return 1.2;
  if (hoursSince <= 12) return 1.1;
  if (hoursSince <= 24) return 1.0;
  if (hoursSince <= 48) return 0.85;
  if (hoursSince <= 72) return 0.75;
  return 0.7;
}

/**
 * Engagement multiplier (0.8 – 1.5)
 * Based on weighted rolling 7-day event window
 */
function computeEngagementMultiplier(ad: AdDocument): number {
  const window = ad.metricsWindow || [];
  if (window.length === 0) return 1.0; // Neutral for no data

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let weightedSum = 0;
  let eventCount = 0;

  for (const entry of window) {
    if (new Date(entry.at).getTime() >= sevenDaysAgo) {
      weightedSum += EVENT_WEIGHT[entry.event] || 1;
      eventCount++;
    }
  }

  // Small sample cap: if fewer than SMALL_SAMPLE_CAP events, dampen toward 1.0
  let rawScore = weightedSum;
  if (eventCount < SMALL_SAMPLE_CAP) {
    const dampening = eventCount / SMALL_SAMPLE_CAP;
    rawScore = weightedSum * dampening;
  }

  // Map 0-500 range to 0.8-1.5
  const normalized = Math.min(rawScore / 500, 1);
  return 0.8 + normalized * 0.7;
}

/**
 * Jitter: ±2% randomization
 */
function applyJitter(score: number): number {
  const jitter = 1 + (Math.random() * 0.04 - 0.02);
  return score * jitter;
}

// ============================================
// MAIN VISIBILITY SCORE COMPUTATION
// ============================================

/**
 * Compute fully composed visibility score for a single ad.
 */
export async function computeVisibilityScore(ad: AdDocument, userAccountTier?: string): Promise<number> {
  const quality = computeQualityMultiplier(ad);
  const trust = await computeTrustMultiplier(ad);
  const freshness = computeFreshnessMultiplier(ad);
  const engagement = computeEngagementMultiplier(ad);
  const tierMult = ACCOUNT_TIER_MULT[userAccountTier || "free"] || 0.85;
  const placementMult = PLACEMENT_TIER_MULT[ad.tier] || 1.0;

  const raw = 1000 * quality * trust * freshness * engagement * tierMult * placementMult;
  return Math.round(applyJitter(raw));
}

/**
 * Recompute and persist visibility score for a single ad.
 */
export async function recomputeAdVisibility(adId: string | mongoose.Types.ObjectId): Promise<number> {
  const ad = await Ad.findById(adId);
  if (!ad || ad.isDeleted || ad.status !== "approved") return 0;

  let accountTier = "free";
  if (ad.userId) {
    const user = await User.findById(ad.userId).select("accountTier");
    if (user) accountTier = (user as any).accountTier || "free";
  }

  const score = await computeVisibilityScore(ad, accountTier);
  const engagement = computeEngagementMultiplier(ad);

  await Ad.findByIdAndUpdate(adId, {
    $set: { visibilityScore: score, engagementScore: Math.round(engagement * 100) },
  });

  return score;
}

/**
 * Recompute visibility scores for ALL active/approved ads.
 * Called by 30-minute cron job.
 */
export async function recomputeAllVisibilityScores(): Promise<number> {
  const ads = await Ad.find({
    isDeleted: false,
    status: "approved",
  }).select("_id userId");

  // Pre-fetch all relevant users for efficiency
  const userIds = [...new Set(ads.filter((a) => a.userId).map((a) => String(a.userId)))];
  const users = await User.find({ _id: { $in: userIds } }).select("accountTier").lean();
  const userTierMap = new Map<string, string>();
  for (const u of users) {
    userTierMap.set(String(u._id), (u as any).accountTier || "free");
  }

  let updated = 0;
  for (const ad of ads) {
    try {
      const fullAd = await Ad.findById(ad._id);
      if (!fullAd) continue;

      const accountTier = userTierMap.get(String(fullAd.userId)) || "free";
      const score = await computeVisibilityScore(fullAd, accountTier);
      const engagement = computeEngagementMultiplier(fullAd);

      await Ad.findByIdAndUpdate(ad._id, {
        $set: { visibilityScore: score, engagementScore: Math.round(engagement * 100) },
      });
      updated++;
    } catch (err: any) {
      logError("Failed to recompute visibility for ad", err);
    }
  }

  logInfo("Visibility scores recomputed", { adsUpdated: updated });
  return updated;
}

// ============================================
// ENGAGEMENT TRACKING
// ============================================

/**
 * Track an engagement event for an ad's metricsWindow.
 */
export async function trackEngagementEvent(
  adId: string | mongoose.Types.ObjectId,
  event: string
): Promise<void> {
  const validEvents = Object.keys(EVENT_WEIGHT);
  if (!validEvents.includes(event)) return;

  await Ad.findByIdAndUpdate(adId, {
    $push: {
      metricsWindow: {
        $each: [{ event, at: new Date() }],
        $slice: -2000, // Keep last 2000 events max
      },
    },
  });
}

/**
 * Prune metricsWindow entries older than 7 days for all ads.
 * Called by cron alongside visibility recomputation.
 */
export async function pruneOldMetricEvents(): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  await Ad.updateMany(
    { "metricsWindow.at": { $lt: sevenDaysAgo } },
    { $pull: { metricsWindow: { at: { $lt: sevenDaysAgo } } } }
  );
}

// ============================================
// DIVERSITY CAP (prevents one user dominating results)
// ============================================

/**
 * Apply diversity cap: max N ads per user in a result page.
 * Call after sorting by visibilityScore to limit domination.
 */
export function applyDiversityCap(
  ads: AdDocument[],
  maxPerUser: number = 3
): AdDocument[] {
  const userCounts = new Map<string, number>();
  const result: AdDocument[] = [];

  for (const ad of ads) {
    const uid = String(ad.userId || "anonymous");
    const count = userCounts.get(uid) || 0;
    if (count < maxPerUser) {
      result.push(ad);
      userCounts.set(uid, count + 1);
    }
  }

  return result;
}

export default {
  computeVisibilityScore,
  recomputeAdVisibility,
  recomputeAllVisibilityScores,
  trackEngagementEvent,
  pruneOldMetricEvents,
  applyDiversityCap,
};
