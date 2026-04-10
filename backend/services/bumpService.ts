/**
 * Bump Service
 * 
 * Handles automatic operations for the ad placement system:
 * - Tap Up: Scheduled auto-bump based on interval (reorders within tier)
 * - Tier expiration: Demote FEATURED/PRIORITY_PLUS/PRIORITY → STANDARD when tierUntil expires
 * - Add-on expiration: websiteLinkUntil, newLabelUntil
 * - Quality score calculation
 * 
 * Key design principles (Vivastreet-style):
 * - Bumps ONLY reorder within a tier, never promote between tiers
 * - Trending = computed from engagement velocity, NOT stored/expired
 * - New Arrival = computed from createdAt < 48h (free badge)
 * - NEW Label = paid add-on, shows "NEW" even when older (newLabelUntil)
 * - tier + tierUntil = single source of truth for paid placement
 * - Default durations: 7 days (matches Vivastreet pricing)
 * 
 * Tier hierarchy:
 * - FEATURED: Top carousel, always above everything
 * - PRIORITY_PLUS: Below Featured, above standard  
 * - PRIORITY: Higher placement above standard listings
 * - STANDARD: Basic paid listing for escorts
 * 
 * This service should be called periodically (e.g., every 5 minutes via cron)
 */

import Ad from "../models/Ad";
import logger from "../utils/logger";

/**
 * Process all ads with active Tap Up that are due for a bump
 * Bumps only affect lastPulsedAt (ordering within tier), not tier itself
 */
export async function processTapUpBumps(): Promise<{ processed: number; errors: number }> {
  const now = new Date();
  let processed = 0;
  let errors = 0;

  try {
    // Find ads with active Tap Up that are due for bump
    const adsDueToBump = await Ad.find({
      hasTapUp: true,
      tapUpUntil: { $gt: now },
      nextTapUpAt: { $lte: now },
      isDeleted: false,
      status: "approved",
    });

    for (const ad of adsDueToBump) {
      try {
        // Calculate next bump time
        const intervalMs = (ad.tapUpIntervalHours || 12) * 60 * 60 * 1000;
        const nextTapUpAt = new Date(now.getTime() + intervalMs);

        // Update lastPulsedAt (for ordering) and schedule next bump
        ad.lastPulsedAt = now;
        ad.nextTapUpAt = nextTapUpAt;
        await ad.save();

        processed++;
        logger.info(`[TapUp] Bumped ad ${ad._id} - next bump at ${nextTapUpAt}`);
      } catch (err) {
        errors++;
        logger.error(`[TapUp] Error bumping ad ${ad._id}:`, err);
      }
    }

    return { processed, errors };
  } catch (err) {
    logger.error("[TapUp] Error in processTapUpBumps:", err);
    return { processed, errors: errors + 1 };
  }
}

/**
 * Deactivate expired Tap Up subscriptions
 */
export async function deactivateExpiredTapUps(): Promise<number> {
  const now = new Date();
  
  try {
    const result = await Ad.updateMany(
      {
        hasTapUp: true,
        tapUpUntil: { $lte: now },
      },
      {
        $set: { hasTapUp: false },
        $unset: { nextTapUpAt: 1 },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`[TapUp] Deactivated ${result.modifiedCount} expired Tap Up subscriptions`);
    }

    return result.modifiedCount;
  } catch (err) {
    logger.error("[TapUp] Error deactivating expired subscriptions:", err);
    return 0;
  }
}

/**
 * Demote ads with expired tier to STANDARD
 * Handles FEATURED, PRIORITY_PLUS, and PRIORITY tiers
 */
export async function demoteExpiredTiers(): Promise<number> {
  const now = new Date();

  try {
    // Find ads with paid tier that have expired
    const result = await Ad.updateMany(
      {
        tier: { $in: ["FEATURED", "PRIORITY_PLUS", "PRIORITY"] },
        tierUntil: { $lte: now },
      },
      {
        $set: { tier: "STANDARD" },
        $unset: { tierUntil: 1 },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`[Tiers] Demoted ${result.modifiedCount} ads to STANDARD (tier expired)`);
    }

    return result.modifiedCount;
  } catch (err) {
    logger.error("[Tiers] Error demoting expired tiers:", err);
    return 0;
  }
}

/**
 * Expire website links that have passed their expiration date
 */
export async function expireWebsiteLinks(): Promise<number> {
  const now = new Date();

  try {
    const result = await Ad.updateMany(
      {
        websiteUrl: { $exists: true, $ne: null },
        websiteLinkUntil: { $lte: now },
      },
      {
        $unset: { websiteUrl: 1, websiteLinkUntil: 1 },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`[WebsiteLinks] Expired ${result.modifiedCount} website links`);
    }

    return result.modifiedCount;
  } catch (err) {
    logger.error("[WebsiteLinks] Error expiring website links:", err);
    return 0;
  }
}

/**
 * Expire paid NEW labels that have passed their expiration date
 * (Vivastreet-style: paid "NEW" badge, default 7 days)
 */
export async function expireNewLabels(): Promise<number> {
  const now = new Date();

  try {
    const result = await Ad.updateMany(
      {
        hasNewLabel: true,
        newLabelUntil: { $lte: now },
      },
      {
        $set: { hasNewLabel: false },
        $unset: { newLabelUntil: 1 },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`[NewLabels] Expired ${result.modifiedCount} paid NEW labels`);
    }

    return result.modifiedCount;
  } catch (err) {
    logger.error("[NewLabels] Error expiring NEW labels:", err);
    return 0;
  }
}

/**
 * Calculate and update quality scores for active ads
 * Quality score is based on:
 * - Image count (more images = better)
 * - Description length
 * - Services listed
 * - Profile completeness
 */
export async function updateQualityScores(): Promise<number> {
  try {
    const ads = await Ad.find({
      isDeleted: false,
      status: "approved",
      // Only update scores that haven't been updated in the last hour
      $or: [
        { qualityScore: { $exists: false } },
        { qualityScore: 0 },
        { updatedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } },
      ],
    }).limit(100); // Process in batches

    let updated = 0;

    for (const ad of ads) {
      let score = 0;

      // Image quality (up to 30 points)
      const imageCount = ad.images?.length || 0;
      score += Math.min(imageCount * 5, 30);

      // Description quality (up to 20 points)
      const descLength = ad.description?.length || 0;
      if (descLength >= 500) score += 20;
      else if (descLength >= 200) score += 15;
      else if (descLength >= 100) score += 10;
      else if (descLength >= 50) score += 5;

      // Services listed (up to 20 points)
      const serviceCount = ad.services?.length || 0;
      score += Math.min(serviceCount * 4, 20);

      // Profile completeness (up to 30 points)
      if (ad.phone) score += 10;
      if (ad.age) score += 5;
      if (ad.ethnicity) score += 5;
      if (ad.bodyType) score += 5;
      if (ad.location) score += 5;

      // Update the ad using findByIdAndUpdate to avoid full schema validation
      // (some ads may have legacy tier values that fail enum validation on save)
      await Ad.findByIdAndUpdate(ad._id, { qualityScore: score });
      updated++;
    }

    if (updated > 0) {
      logger.info(`[Quality] Updated quality scores for ${updated} ads`);
    }

    return updated;
  } catch (err) {
    logger.error("[Quality] Error updating quality scores:", err);
    return 0;
  }
}

/**
 * Compute trending status for an ad based on engagement velocity
 * This is called at query time, NOT stored in the database
 * 
 * Trending = above-average engagement in the last 24 hours
 */
export function computeTrendingScore(ad: {
  views: number;
  clicks: number;
  createdAt: Date;
}): number {
  // Calculate engagement velocity (views + clicks weighted)
  const engagement = (ad.views || 0) + (ad.clicks || 0) * 3;
  
  // Calculate age in hours
  const ageHours = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60);
  
  // Velocity = engagement per hour (avoid division by zero)
  const velocity = engagement / Math.max(ageHours, 1);
  
  return velocity;
}

/**
 * Check if an ad is "trending" (high engagement velocity)
 * This should be computed at query time, not stored
 */
export function isTrending(ad: {
  views: number;
  clicks: number;
  createdAt: Date;
}, averageVelocity: number = 1): boolean {
  const velocity = computeTrendingScore(ad);
  // Trending if velocity is 2x the average
  return velocity >= averageVelocity * 2;
}

/**
 * Check if an ad is a "new arrival" (created < 48 hours ago)
 * This is the FREE computed badge
 */
export function isNewArrival(createdAt: Date): boolean {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return ageHours <= 48;
}

/**
 * Check if ad should show NEW badge (paid OR computed)
 * Priority: Paid NEW label > Computed New Arrival
 */
export function shouldShowNewBadge(ad: {
  hasNewLabel?: boolean;
  newLabelUntil?: Date;
  createdAt: Date;
}): { showNew: boolean; isPaid: boolean } {
  const now = new Date();
  
  // Check paid NEW label first
  if (ad.hasNewLabel && ad.newLabelUntil && new Date(ad.newLabelUntil) > now) {
    return { showNew: true, isPaid: true };
  }
  
  // Fallback to computed new arrival
  if (isNewArrival(ad.createdAt)) {
    return { showNew: true, isPaid: false };
  }
  
  return { showNew: false, isPaid: false };
}

/**
 * Run all scheduled bump operations
 * This should be called periodically (e.g., every 5 minutes)
 */
export async function runScheduledBumpOperations(): Promise<void> {
  logger.info("[BumpService] Starting scheduled operations...");

  const startTime = Date.now();

  // Process Tap Up bumps (reorder within tier)
  const tapUpResult = await processTapUpBumps();

  // Deactivate expired Tap Ups
  await deactivateExpiredTapUps();

  // Demote expired FEATURED/PRIORITY_PLUS/PRIORITY to STANDARD
  await demoteExpiredTiers();

  // Expire paid add-ons
  await expireWebsiteLinks();
  await expireNewLabels();

  // Update quality scores
  await updateQualityScores();

  const duration = Date.now() - startTime;
  logger.info(
    `[BumpService] Completed in ${duration}ms. TapUp: ${tapUpResult.processed} bumped, ${tapUpResult.errors} errors`
  );
}

export default {
  processTapUpBumps,
  deactivateExpiredTapUps,
  demoteExpiredTiers,
  expireWebsiteLinks,
  expireNewLabels,
  updateQualityScores,
  computeTrendingScore,
  isTrending,
  isNewArrival,
  shouldShowNewBadge,
  runScheduledBumpOperations,
};
