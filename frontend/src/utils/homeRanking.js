/**
 * Home Page Ranking Utility (Vivastreet-style)
 * 
 * PLACEMENT BUCKETS (determines page section):
 * - FEATURED = VIP carousel block, top of page (swipeable with peek)
 * - PRIORITY_PLUS = Featured grid block, below VIP (2-col on mobile)
 * - PRIORITY + STANDARD = Same feed bucket (no position difference!)
 * 
 * VIP CAROUSEL UX:
 * - Swipeable with peek (10-20% of next card visible)
 * - No autoplay (hurts usability)
 * - "View all Featured" link for discoverability
 * - Dots/indicator + optional arrows
 * - Deterministic daily rotation for fairness
 * 
 * FEATURED GRID UX:
 * - 2-column grid on mobile (clean scan, less swipe fatigue)
 * - Show 8 items on homepage
 * - "Show more Featured" link
 * 
 * DAILY ROTATION (fairness algorithm):
 * - Seed: YYYY-MM-DD + location + category
 * - Rotates Featured list by hash offset so everyone gets "first swipe" eventually
 * - Predictable/testable: same day + same filters = same order
 * 
 * PRIORITY = Visual "stand out" styling ONLY, NOT a placement upgrade.
 * This matches Vivastreet's "Highlight" which is visual emphasis,
 * while "Priority Plus" is what moves ads above basic listings.
 * 
 * COMPUTED BADGES (free, derived at query time):
 * - Trending = high engagement velocity (views+clicks in last 24h)
 * - New Arrival = createdAt < 48 hours
 * 
 * PAID BADGES:
 * - NEW Label = hasNewLabel && newLabelUntil > now (paid, 7 days)
 *   → Shows "NEW" even when listing is older than 48h
 * 
 * BUMP SYSTEM:
 * - Bumps only reorder WITHIN a bucket (lastPulsedAt DESC)
 * - Tap Up / Tumble Up NEVER jump between buckets
 * 
 * Ranking within each bucket:
 * Trending first → lastPulsedAt → qualityScore → createdAt
 * 
 * Default durations: 7 days (matches Vivastreet pricing)
 */

// ============================================
// COMPUTED BADGE HELPERS (not stored in DB)
// ============================================

/**
 * Check if ad is a "New Arrival" (created < 48 hours ago)
 * This is the FREE computed badge
 */
export function isNewArrival(ad) {
  if (!ad.createdAt) return false;
  const hoursOld = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60);
  return hoursOld <= 48;
}

/**
 * Check if ad has paid NEW label
 */
export function hasPaidNewLabel(ad) {
  if (!ad.hasNewLabel || !ad.newLabelUntil) return false;
  return new Date(ad.newLabelUntil) > new Date();
}

/**
 * Check if ad should show NEW badge (paid OR computed)
 * Priority: Paid NEW label > Computed New Arrival
 */
export function shouldShowNewBadge(ad) {
  // Paid label takes priority
  if (hasPaidNewLabel(ad)) {
    return { showNew: true, isPaid: true };
  }
  // Fallback to computed new arrival
  if (isNewArrival(ad)) {
    return { showNew: true, isPaid: false };
  }
  return { showNew: false, isPaid: false };
}

/**
 * Calculate trending score based on engagement velocity
 * Returns velocity = (views + clicks*3) / age_in_hours
 */
export function calculateTrendingVelocity(ad) {
  if (!ad.createdAt) return 0;
  
  const engagement = (ad.views || 0) + (ad.clicks || 0) * 3;
  const ageHours = Math.max(1, (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60));
  
  return engagement / ageHours;
}

/**
 * Check if ad is "Trending" (velocity >= threshold)
 * Default threshold is 0.5 engagements per hour
 */
export function isTrending(ad, threshold = 0.5) {
  return calculateTrendingVelocity(ad) >= threshold;
}

// ============================================
// DAILY ROTATION (fairness algorithm)
// ============================================

/**
 * Simple stable hash for deterministic rotation
 * Converts string seed to consistent integer
 */
function stableHash32(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Rotate array by deterministic offset based on seed
 * Goal: if there are 200 VIPs, everyone eventually gets "first swipe" position
 * 
 * @param {Array} items - Sorted items to rotate
 * @param {string} seed - Daily seed (e.g., "2025-12-29|London|escorts")
 * @param {number} limit - Max items to return (for homepage)
 * @returns {Array} Rotated and limited items
 */
export function rotateDaily(items, seed, limit = Infinity) {
  const n = items.length;
  if (n === 0) return [];
  
  const h = stableHash32(seed);
  const offset = Math.abs(h) % n;
  
  // Rotate: items after offset come first, then items before offset
  const rotated = items.slice(offset).concat(items.slice(0, offset));
  
  return limit === Infinity ? rotated : rotated.slice(0, limit);
}

/**
 * Build daily rotation seed from context
 * Same day + same filters = same VIP order (predictable/testable)
 */
export function buildRotationSeed(location = '', category = '') {
  return `${getTodayString()}|${location.toLowerCase()}|${category.toLowerCase()}`;
}

// ============================================
// TIER HELPERS
// ============================================

/**
 * Get effective placement tier from ad
 * Single source of truth: tier field
 * Tiers: FEATURED > PRIORITY_PLUS > PRIORITY > STANDARD
 */
function getEffectiveTier(ad) {
  // Check tier + tierUntil expiration
  if (ad.tier && ad.tier !== 'STANDARD') {
    if (ad.tierUntil && new Date(ad.tierUntil) > new Date()) {
      return ad.tier;
    }
    // Expired tier = STANDARD
    return 'STANDARD';
  }
  return ad.tier || 'STANDARD';
}

/**
 * Check if ad has PRIORITY tier (visual highlight, doesn't change position)
 */
export function isGlowAd(ad) {
  return getEffectiveTier(ad) === 'PRIORITY';
}

/**
 * Calculate ranking score for ordering within tier
 * Used for: lastPulsedAt → qualityScore → createdAt
 */
function calculateRankingScore(ad) {
  let score = 0;
  
  // Bump recency - primary factor within tier
  // Max 10000 points, decays over 24 hours
  if (ad.lastPulsedAt) {
    const hoursSinceBump = (Date.now() - new Date(ad.lastPulsedAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 10000 - (hoursSinceBump * 417));
  }
  
  // Quality score - secondary factor (0-100 scale)
  score += (ad.qualityScore || 0) * 10;
  
  // Creation recency - tie-breaker
  if (ad.createdAt) {
    const daysOld = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 100 - daysOld);
  }
  
  return score;
}

// ============================================
// MAIN BUILDER
// ============================================

/**
 * Build home page lists with tiered placement
 * 
 * Layout:
 * 1. VIP Block (FEATURED) - Swipeable carousel with peek, daily rotation
 * 2. Featured Block (PRIORITY_PLUS) - 2-column grid, "Show more" link
 * 3. Standard Feed - All remaining (PRIORITY + STANDARD), with styling
 * 
 * Featured uses daily rotation for fairness (everyone gets "first swipe" eventually)
 * Priority Plus shows limited grid with "Show more" link to /featured
 * 
 * @param {Array} ads - All ads from API
 * @param {Object} opts - Configuration options
 * @returns {{ vip: Array, vipTotal: number, popular: Array, popularTotal: number, all: Array }}
 */
export function buildHomeLists(ads, opts = {}) {
  const {
    // Homepage limits (carousel/grid show subset, "View all" shows rest)
    vipLimit = 12,           // VIP carousel homepage limit
    popularLimit = 8,        // Featured grid homepage limit (2 cols × 4 rows)
    trendingThreshold = 0.5, // Velocity threshold for trending badge
    sortBy = 'featured',
    // Context for daily rotation seed
    location = '',
    category = ''
  } = opts;
  
  if (!Array.isArray(ads) || ads.length === 0) {
    return { vip: [], vipTotal: 0, popular: [], popularTotal: 0, all: [] };
  }
  
  const usedIds = new Set();
  
  // ============================================
  // 1. FEATURED BLOCK (with daily rotation)
  // ============================================
  const allVipAds = ads
    .filter(ad => getEffectiveTier(ad) === 'FEATURED')
    .map(ad => ({
      ...ad,
      _rankingScore: calculateRankingScore(ad),
      _tier: 'FEATURED',
      _isNewArrival: isNewArrival(ad),
      _hasPaidNewLabel: hasPaidNewLabel(ad),
      _isTrending: isTrending(ad, trendingThreshold),
      _isGlow: false
    }))
    .sort((a, b) => b._rankingScore - a._rankingScore);
  
  // Apply daily rotation for fairness (everyone gets "first swipe" eventually)
  // Use distinct seed suffix for VIP vs PRIME to get different rotations
  const baseSeed = buildRotationSeed(location, category);
  const vipAds = rotateDaily(allVipAds, baseSeed + '|VIP', vipLimit);
  const vipTotal = allVipAds.length;
  
  vipAds.forEach(ad => usedIds.add(ad._id));
  
  // ============================================
  // 2. PRIORITY_PLUS BLOCK (grid with daily rotation)
  // Same fairness algorithm as Featured - everyone gets homepage exposure
  // ============================================
  const allPopularAds = ads
    .filter(ad => !usedIds.has(ad._id) && getEffectiveTier(ad) === 'PRIORITY_PLUS')
    .map(ad => ({
      ...ad,
      _rankingScore: calculateRankingScore(ad),
      _tier: 'PRIORITY_PLUS',
      _isNewArrival: isNewArrival(ad),
      _hasPaidNewLabel: hasPaidNewLabel(ad),
      _isTrending: isTrending(ad, trendingThreshold),
      _isGlow: false
    }))
    .sort((a, b) => b._rankingScore - a._rankingScore);
  
  // Apply daily rotation to PRIORITY_PLUS too (fairness - same 8 don't dominate forever)
  // Use distinct seed suffix so FEATURED and PRIORITY_PLUS rotate independently
  const popularAds = rotateDaily(allPopularAds, baseSeed + '|PRIORITY_PLUS', popularLimit);
  const popularTotal = allPopularAds.length;
  
  popularAds.forEach(ad => usedIds.add(ad._id));
  
  // ============================================
  // 3. STANDARD FEED (PRIORITY + STANDARD together)
  // PRIORITY ads get visual pop ONLY - NO position advantage over STANDARD
  // This is the key Vivastreet behavior: Highlight = stand out visually,
  // not "move above basic ads" (that's what PRIORITY_PLUS/Featured does)
  // IMPORTANT: Only include STANDARD and PRIORITY tiers here!
  // PRIORITY_PLUS/FEATURED overflow must NOT leak into the basic feed.
  // ============================================
  let standardAds = ads
    .filter(ad => {
      if (usedIds.has(ad._id)) return false;
      const t = getEffectiveTier(ad);
      return t === 'STANDARD' || t === 'PRIORITY';
    })
    .map(ad => {
      const effectiveTier = getEffectiveTier(ad);
      return {
        ...ad,
        _rankingScore: calculateRankingScore(ad),
        _tier: effectiveTier,
        _isNewArrival: isNewArrival(ad),
        _hasPaidNewLabel: hasPaidNewLabel(ad),
        _isTrending: isTrending(ad, trendingThreshold),
        _isGlow: effectiveTier === 'PRIORITY'  // Visual styling ONLY, not ordering
      };
    });
  
  // Apply sorting to standard feed
  // IMPORTANT: PRIORITY has NO ordering advantage - only visual styling
  // Trending is badge-only, NOT a sort factor (otherwise it becomes a hidden tier)
  if (sortBy === 'featured') {
    standardAds.sort((a, b) => {
      // Sort by ranking score only (lastPulsedAt → qualityScore → createdAt)
      // Trending is visual badge only, no ordering advantage
      return b._rankingScore - a._rankingScore;
    });
  } else if (sortBy === 'newest') {
    standardAds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === 'distance') {
    standardAds.sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }
  
  return {
    vip: vipAds,           // FEATURED - VIP carousel (rotated, limited)
    vipTotal,              // Total Featured count for "View all" link
    popular: popularAds,   // PRIORITY_PLUS - Featured grid (limited)
    popularTotal,          // Total Priority Plus count for "Show more" link
    all: standardAds       // PRIORITY + STANDARD - normal feed
  };
}

// ============================================
// EXPORTED HELPERS FOR COMPONENTS
// ============================================

/**
 * Check if ad should show NEW badge (paid OR computed)
 * Returns { showNew, isPaid } for display logic
 */
export function isNewArrivalAd(ad) {
  // Already computed in buildHomeLists
  if (ad._hasPaidNewLabel === true) return true;
  if (ad._isNewArrival === true) return true;
  // Fallback computation
  return shouldShowNewBadge(ad).showNew;
}

/**
 * Check if ad should show Trending styling
 */
export function isTrendingAd(ad) {
  return ad._isTrending === true || isTrending(ad);
}

/**
 * Check if ad should show GLOW styling (visual highlight)
 */
export function isGlowStyledAd(ad) {
  return ad._isGlow === true || isGlowAd(ad);
}

/**
 * Get ad's placement tier
 */
export function getAdTier(ad) {
  return ad._tier || getEffectiveTier(ad);
}

export default buildHomeLists;
