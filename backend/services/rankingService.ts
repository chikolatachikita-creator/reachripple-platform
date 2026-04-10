import Ad, { AdDocument, PlacementTier } from '../models/Ad';
import { AdminConfig } from '../models/AdminConfig';
import { BADGE_CONFIG, QUALITY_SCORE_WEIGHTS } from '../constants/boostConfig';
import { logInfo, logDebug } from '../utils/logger';
import { escapeRegex } from '../utils/sanitize';

/**
 * Server-Side Ranking Service
 * 
 * Implements Vivastreet-style tiered placement with:
 * - Strict tier separation (FEATURED > PRIORITY_PLUS > PRIORITY/STANDARD)
 * - Daily deterministic rotation within tiers
 * - Quality score tie-breaking
 * - Badge computation (New Arrival, Trending)
 */

// ============================================
// TYPES
// ============================================

export interface RankedAd extends Partial<AdDocument> {
  _id: any;
  tier: PlacementTier;
  lastPulsedAt: Date;
  qualityScore: number;
  createdAt: Date;
  
  // Computed badges
  isNewArrival?: boolean;
  isTrending?: boolean;
  hasActiveGlow?: boolean;
  hasPaidNewLabel?: boolean;
}

export interface HomeListsResult {
  vip: RankedAd[];          // FEATURED tier (VIP carousel)
  featured: RankedAd[];     // PRIORITY_PLUS tier (Featured section)
  standard: RankedAd[];     // STANDARD + PRIORITY (Main feed)
  totalCount: number;
  generatedAt: Date;
  seed: string;             // Daily rotation seed
}

// ============================================
// SEED GENERATION
// ============================================

/**
 * Generate daily seed for deterministic rotation
 * Same seed = same order throughout the day
 * Distinct seeds for VIP vs PRIORITY_PLUS to prevent same rotation
 */
function getDailySeed(location?: string, category?: string, tierSuffix?: string): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const suffix = tierSuffix ? `|${tierSuffix}` : '';
  return `${dateStr}-${location || 'global'}-${category || 'all'}${suffix}`;
}

/**
 * Pseudo-random number generator with seed
 * Used for deterministic shuffling
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

/**
 * Deterministic shuffle using seeded random
 */
function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const rng = seededRandom(seed);
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// ============================================
// BADGE COMPUTATION
// ============================================

/**
 * Check if ad qualifies for New Arrival badge (free, 48h)
 */
function isNewArrival(ad: RankedAd): boolean {
  const maxAge = BADGE_CONFIG.NEW_ARRIVAL.maxHoursOld * 60 * 60 * 1000;
  const age = Date.now() - new Date(ad.createdAt).getTime();
  return age < maxAge;
}

/**
 * Check if ad qualifies for Trending badge
 * Based on engagement velocity (views + clicks per hour)
 */
function isTrending(ad: RankedAd): boolean {
  const views = (ad as any).views || 0;
  const clicks = (ad as any).clicks || 0;
  
  if (views < BADGE_CONFIG.TRENDING.minViews) return false;
  
  const ageHours = (Date.now() - new Date(ad.createdAt).getTime()) / (60 * 60 * 1000);
  const velocity = (views + clicks * 2) / Math.max(1, ageHours);
  
  return velocity >= BADGE_CONFIG.TRENDING.velocityThreshold;
}

/**
 * Check if ad has active PRIORITY tier (highlight styling)
 */
function hasActiveHighlight(ad: RankedAd): boolean {
  if (ad.tier !== 'PRIORITY') return false;
  if (!(ad as any).tierUntil) return false;
  return new Date((ad as any).tierUntil) > new Date();
}

/**
 * Check if ad has paid NEW label (not just new arrival)
 */
function hasPaidNewLabel(ad: RankedAd): boolean {
  if (!(ad as any).hasNewLabel) return false;
  if (!(ad as any).newLabelUntil) return false;
  return new Date((ad as any).newLabelUntil) > new Date();
}

// ============================================
// QUALITY SCORE
// ============================================

/**
 * Calculate quality score for an ad
 * Used for tie-breaking within the same tier
 */
export function calculateQualityScore(ad: any): number {
  let score = 0;
  const weights = QUALITY_SCORE_WEIGHTS;
  
  if (ad.images?.length > 0) score += weights.hasPhotos;
  if (ad.description?.length > 50) score += weights.hasDescription;
  if (ad.phone) score += weights.hasPhone;
  if (ad.services?.length > 0 || ad.selectedServices?.length > 0) score += weights.hasServices;
  if (ad.price > 0) score += weights.hasPrice;
  if (ad.description?.length > 200) score += weights.hasBio; // Longer bio
  if ((ad as any).isVerified) score += weights.isVerified;
  
  return score;
}

// ============================================
// SORTING FUNCTIONS
// ============================================

/**
 * Sort ads by bump time (lastPulsedAt) within same tier
 * Most recently bumped first
 */
function sortByBumpTime(ads: RankedAd[]): RankedAd[] {
  return [...ads].sort((a, b) => {
    const timeA = new Date(a.lastPulsedAt || a.createdAt).getTime();
    const timeB = new Date(b.lastPulsedAt || b.createdAt).getTime();
    
    // Same bump time? Use quality score as tiebreaker
    if (Math.abs(timeA - timeB) < 1000) {
      return (b.qualityScore || 0) - (a.qualityScore || 0);
    }
    
    return timeB - timeA; // Descending (most recent first)
  });
}

/**
 * Apply daily rotation to ads
 * Shuffles deterministically so same order all day
 */
function applyDailyRotation(ads: RankedAd[], seed: string, percentage: number = 0.3): RankedAd[] {
  if (ads.length <= 5) return ads;
  
  // Keep top 30% in fixed positions, rotate the rest
  const fixedCount = Math.ceil(ads.length * (1 - percentage));
  const fixed = ads.slice(0, fixedCount);
  const rotatable = ads.slice(fixedCount);
  
  const shuffled = shuffleWithSeed(rotatable, seed);
  
  return [...fixed, ...shuffled];
}

// ============================================
// MAIN QUERY FUNCTION
// ============================================

export interface HomeQueryParams {
  location?: string;
  outcode?: string;
  category?: string;
  page?: number;
  limit?: number;
  excludeIds?: string[];
}

/**
 * Build homepage lists with strict tier separation
 * 
 * Query Flow:
 * 1. Fetch all approved, non-deleted ads
 * 2. Clean expired tiers/labels
 * 3. Separate by tier (FEATURED, PRIORITY_PLUS, PRIORITY+STANDARD)
 * 4. Sort by bump time within each tier
 * 5. Apply daily rotation for fairness
 * 6. Compute badges (New Arrival, Trending)
 */
export async function buildHomeLists(params: HomeQueryParams = {}): Promise<HomeListsResult> {
  const {
    location,
    outcode,
    category,
    page = 1,
    limit = 50,
    excludeIds = [],
  } = params;
  
  const seed = getDailySeed(location, category);
  const vipSeed = getDailySeed(location, category, 'VIP');
  const primeSeed = getDailySeed(location, category, 'PRIORITY_PLUS');
  const feedSeed = getDailySeed(location, category, 'FEED');
  const now = new Date();
  
  // Get config for this location
  const config = await AdminConfig.getEffectiveConfig(location);
  
  // Build base query
  const baseQuery: any = {
    status: 'approved',
    isDeleted: { $ne: true },
  };
  
  // Location filter
  if (outcode) {
    baseQuery.outcode = outcode.toUpperCase();
  } else if (location) {
    baseQuery.$or = [
      { location: new RegExp(escapeRegex(location), 'i') },
      { locationSlug: location.toLowerCase() },
    ];
  }
  
  // Category filter
  if (category) {
    baseQuery.$or = baseQuery.$or || [];
    baseQuery.category = new RegExp(escapeRegex(category), 'i');
  }
  
  // Exclude specific ads
  if (excludeIds.length > 0) {
    baseQuery._id = { $nin: excludeIds };
  }
  
  // Fetch ads with tier-based sorting
  const ads = await Ad.find(baseQuery)
    .select('-rejectionReason -isDeleted -__v')
    .sort({ tier: -1, lastPulsedAt: -1, qualityScore: -1, createdAt: -1 })
    .limit(500) // Reasonable cap for performance
    .lean();
  
  logDebug('buildHomeLists query', {
    location,
    outcode,
    totalAds: ads.length,
  });
  
  // Separate by tier
  const vip: RankedAd[] = [];
  const featured: RankedAd[] = [];
  const standard: RankedAd[] = [];
  
  for (const ad of ads) {
    const rankedAd = ad as unknown as RankedAd;
    
    // Clean expired tiers (in-memory, not persisted here)
    const tierUntil = (ad as any).tierUntil;
    const effectiveTier = (tierUntil && new Date(tierUntil) < now) 
      ? 'STANDARD' 
      : (ad.tier || 'STANDARD');
    
    // Compute badges
    rankedAd.isNewArrival = isNewArrival(rankedAd);
    rankedAd.isTrending = isTrending(rankedAd);
    rankedAd.hasActiveGlow = hasActiveHighlight(rankedAd);
    rankedAd.hasPaidNewLabel = hasPaidNewLabel(rankedAd);
    
    // Sort into buckets
    switch (effectiveTier) {
      case 'FEATURED':
        if (vip.length < (config.vipCarouselMaxItems || 10)) {
          vip.push(rankedAd);
        }
        break;
      case 'PRIORITY_PLUS':
        featured.push(rankedAd);
        break;
      case 'PRIORITY':
      case 'STANDARD':
      default:
        standard.push(rankedAd);
        break;
    }
  }
  
  // Sort each bucket by bump time
  const sortedVip = sortByBumpTime(vip);
  const sortedFeatured = sortByBumpTime(featured);
  
  // PRIORITY is VISUAL-ONLY: mixed with STANDARD, no ordering advantage
  // Only hasActiveGlow flag is set for frontend styling (pink ring / badge)
  const sortedFeed = sortByBumpTime(standard);
  
  // Apply daily rotation with distinct seeds per tier
  const rotatedVip = applyDailyRotation(sortedVip, vipSeed);
  const rotatedFeatured = applyDailyRotation(sortedFeatured, primeSeed);
  const rotatedFeed = applyDailyRotation(sortedFeed, feedSeed);
  
  // Combined feed: PRIORITY mixed with STANDARD (visual-only difference)
  const combinedFeed = rotatedFeed;
  
  // Paginate standard (VIP and Featured are shown in full on homepage)
  const startIndex = (page - 1) * limit;
  const paginatedFeed = combinedFeed.slice(startIndex, startIndex + limit);
  
  // Count PRIORITY vs STANDARD for logging (PRIORITY is visual-only)
  const glowCount = combinedFeed.filter(ad => ad.hasActiveGlow).length;
  const standardCount = combinedFeed.filter(ad => !ad.hasActiveGlow).length;
  
  logInfo('buildHomeLists result', {
    location,
    vipCount: rotatedVip.length,
    featuredCount: rotatedFeatured.length,
    feedCount: combinedFeed.length,
    glowCount, // Visual-only, no ordering advantage
    standardCount,
    page,
    vipSeed,
    primeSeed,
  });
  
  return {
    vip: rotatedVip,
    featured: rotatedFeatured,
    standard: paginatedFeed,
    totalCount: ads.length,
    generatedAt: now,
    seed: vipSeed, // Primary seed for debugging
  };
}

// ============================================
// BUCKET STATS (for admin dashboard)
// ============================================

export async function getBucketStats(): Promise<{
  promoted: number;
  verified: number;
  standard: number;
  lowQuality: number;
  total: number;
}> {
  const baseFilter = { status: 'approved', isDeleted: { $ne: true } };
  const now = new Date();
  const paidTiers = ['FEATURED', 'PRIORITY_PLUS'];

  const [promoted, verified, standard, lowQuality, total] = await Promise.all([
    Ad.countDocuments({ ...baseFilter, tier: { $in: paidTiers }, tierUntil: { $gt: now } }),
    Ad.countDocuments({ ...baseFilter, tier: { $nin: paidTiers }, qualityScore: { $gte: 70 } }),
    Ad.countDocuments({ ...baseFilter, tier: { $nin: paidTiers }, qualityScore: { $gte: 30, $lt: 70 } }),
    Ad.countDocuments({ ...baseFilter, qualityScore: { $lt: 30 } }),
    Ad.countDocuments(baseFilter),
  ]);

  return { promoted, verified, standard, lowQuality, total };
}

// ============================================
// UTILITY EXPORTS
// ============================================

export {
  getDailySeed,
  shuffleWithSeed,
  isNewArrival,
  isTrending,
  hasActiveHighlight as hasActiveGlow,
  hasPaidNewLabel,
  sortByBumpTime,
  applyDailyRotation,
};
