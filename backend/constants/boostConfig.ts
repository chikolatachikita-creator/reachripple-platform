/**
 * Boost System Configuration
 * Vivastreet-style tiered placement + bump system
 */

// ============================================
// TIER CONFIGURATION
// ============================================

export const PLACEMENT_TIERS = {
  FEATURED: {
    name: 'Featured',
    displayName: 'Featured Listing',
    priority: 4,
    description: 'Top carousel position, maximum visibility',
    defaultDurationDays: 7,
    basePriceGBP: 29.99,
  },
  PRIORITY_PLUS: {
    name: 'Priority Plus',
    displayName: 'Priority Plus',
    priority: 3,
    description: 'Premium placement above standard and priority listings',
    defaultDurationDays: 7,
    basePriceGBP: 16.99,
  },
  PRIORITY: {
    name: 'Priority',
    displayName: 'Priority Listing',
    priority: 2,
    description: 'Higher placement above standard listings',
    defaultDurationDays: 7,
    basePriceGBP: 9.99,
  },
  STANDARD: {
    name: 'Standard',
    displayName: 'Standard Listing',
    priority: 1,
    description: 'Regular feed listing for escort ads',
    defaultDurationDays: 7,
    basePriceGBP: 4.99,
  },
} as const;

export type PlacementTierKey = keyof typeof PLACEMENT_TIERS;

// ============================================
// BUMP CONFIGURATION
// ============================================

export const BUMP_CONFIG = {
  // Manual bump (free with Priority Plus or Featured)
  TUMBLE_UP: {
    cooldownMinutes: 20,
    allowedTiers: ['PRIORITY_PLUS', 'FEATURED'] as PlacementTierKey[],
    priceGBP: 0,
  },
} as const;

// ============================================
// ADD-ONS CONFIGURATION
// ============================================

export const ADDON_CONFIG = {
  HIGHLIGHT: {
    displayName: 'Highlight',
    description: 'Visual highlight border for extra attention',
    defaultDurationDays: 7,
    basePriceGBP: 6.99,
  },
  EXTERNAL_LINK: {
    displayName: 'External Link',
    description: 'Add external website link to profile',
    defaultDurationDays: 7,
    basePriceGBP: 4.99,
  },
} as const;

// ============================================
// VERIFICATION LEVELS
// ============================================

export const VERIFICATION_LEVELS = {
  NONE: { level: 0, name: 'Unverified' },
  VIEWER: { level: 1, name: 'Viewer Verified' }, // Phone/email verified
  PUBLISHER: { level: 2, name: 'Publisher Verified' }, // ID verified
  TRUSTED: { level: 3, name: 'Trusted' }, // Long-standing, good reviews
} as const;

export type VerificationLevelKey = keyof typeof VERIFICATION_LEVELS;

// ============================================
// ENGAGEMENT & BADGES
// ============================================

export const BADGE_CONFIG = {
  NEW_ARRIVAL: {
    maxHoursOld: 48, // Free "New Arrival" badge for first 48 hours
  },
  TRENDING: {
    velocityThreshold: 0.5, // Engagements per hour to be trending
    minViews: 10, // Minimum views to qualify
  },
} as const;

// ============================================
// QUALITY SCORE WEIGHTS
// ============================================

export const QUALITY_SCORE_WEIGHTS = {
  hasPhotos: 20,
  hasDescription: 15,
  hasPhone: 10,
  hasServices: 15,
  hasPrice: 10,
  hasBio: 10,
  isVerified: 20,
} as const;

// ============================================
// ABUSE PREVENTION
// ============================================

export const ABUSE_LIMITS = {
  maxBumpsPerHour: 6, // Rate limit on bump endpoint
  maxReports30d: 5, // Ads with more reports may be flagged
  duplicateSessionWindowMs: 30 * 60 * 1000, // 30 min - don't count same session twice
} as const;

// ============================================
// POSTING LIMITS (per account type & plan)
// ============================================

export const POSTING_LIMITS = {
  independent: {
    free: { maxActiveAds: 1, ratePerDay: 2 },
    basic: { maxActiveAds: 3, ratePerDay: 5 },
    premium: { maxActiveAds: 5, ratePerDay: 10 },
  },
  agency: {
    free: { maxActiveAds: 10, ratePerDay: 10 },
    basic: { maxActiveAds: 50, ratePerDay: 25 },
    premium: { maxActiveAds: 150, ratePerDay: 50 },
  },
} as const;

export type AccountType = keyof typeof POSTING_LIMITS;
export type PostingPlan = keyof typeof POSTING_LIMITS['independent'];

// ============================================
// PRODUCT SKUs (config-driven monetization)
// ============================================

export const PRODUCT_SKUS = {
  // Placement tiers
  STANDARD: {
    sku: 'STANDARD',
    displayName: 'Standard Listing',
    description: 'Regular feed listing for escort ads',
    tier: 'STANDARD' as const,
    basePriceGBP: 4.99,
    defaultDurationDays: 7,
    availableTo: ['independent', 'agency'] as const,
  },
  PRIORITY: {
    sku: 'PRIORITY',
    displayName: 'Priority Listing',
    description: 'Higher placement above standard listings',
    tier: 'PRIORITY' as const,
    basePriceGBP: 9.99,
    defaultDurationDays: 7,
    availableTo: ['independent', 'agency'] as const,
  },
  PRIORITY_PLUS: {
    sku: 'PRIORITY_PLUS',
    displayName: 'Priority Plus',
    description: 'Premium placement above standard and priority listings',
    tier: 'PRIORITY_PLUS' as const,
    basePriceGBP: 16.99,
    defaultDurationDays: 7,
    availableTo: ['independent', 'agency'] as const,
  },
  FEATURED: {
    sku: 'FEATURED',
    displayName: 'Featured Listing',
    description: 'Top carousel position with maximum visibility',
    tier: 'FEATURED' as const,
    basePriceGBP: 29.99,
    defaultDurationDays: 7,
    availableTo: ['independent', 'agency'] as const,
  },
  // Bump (free with Premium tiers)
  BUMP_MANUAL: {
    sku: 'BUMP_MANUAL',
    displayName: 'Tumble Up',
    description: 'Instant one-time bump to top of your tier',
    basePriceGBP: 0,
    defaultDurationDays: 0,
    requiresTier: ['PRIORITY_PLUS', 'FEATURED'] as const,
    availableTo: ['independent', 'agency'] as const,
  },
  // Add-ons
  HIGHLIGHT: {
    sku: 'HIGHLIGHT',
    displayName: 'Highlight',
    description: 'Visual highlight border for extra attention',
    basePriceGBP: 6.99,
    defaultDurationDays: 7,
    availableTo: ['independent', 'agency'] as const,
  },
  EXTERNAL_LINK: {
    sku: 'EXTERNAL_LINK',
    displayName: 'External Link',
    description: 'Add external website link to profile',
    basePriceGBP: 4.99,
    defaultDurationDays: 7,
    availableTo: ['independent', 'agency'] as const,
  },
} as const;

export type ProductSkuKey = keyof typeof PRODUCT_SKUS;

// ============================================
// ESCORT-ONLY MONETIZATION
// Only the 'escorts' category requires paid tiers.
// All other categories allow free ad posting.
// ============================================

export const MONETIZED_CATEGORIES = ['escorts'] as const;

// ============================================
// EXPIRY NOTIFICATIONS
// ============================================

export const EXPIRY_NOTIFICATIONS = {
  ADVANCE_HOURS: [48, 12], // Notify 48h and 12h before expiry
} as const;

// ============================================
// DEFAULT INVENTORY CAPS (per location)
// ============================================

export const DEFAULT_CAPS = {
  vipCapPerLocation: 50,
  featuredCapPerLocation: 200,
} as const;

// ============================================
// PRICING MULTIPLIERS BY LOCATION
// ============================================

export const DEFAULT_DEMAND_MULTIPLIERS: Record<string, number> = {
  'london': 1.5,
  'manchester': 1.2,
  'birmingham': 1.1,
  'leeds': 1.0,
  'glasgow': 1.0,
  'default': 1.0,
};

// ============================================
// TAP-UP SCHEDULER CONFIGURATION
// ============================================

export const SCHEDULER_CONFIG = {
  TAP_UP_CHECK_INTERVAL_MS: 5000, // Check every 5 seconds
  LOCK_TTL_MS: 10000, // Lock expires after 10 seconds
  REDIS_KEY_PREFIX: 'tapup',
} as const;

// ============================================
// DURATION PRICING FACTORS
// ============================================

export const DURATION_FACTORS: Record<number, number> = {
  1: 0.2,   // 1 day = 20% of weekly price
  3: 0.5,   // 3 days = 50% of weekly price
  7: 1.0,   // 7 days = full price
  14: 1.8,  // 14 days = 80% discount on second week
  30: 3.0,  // 30 days = 57% discount overall
};

export default {
  PLACEMENT_TIERS,
  BUMP_CONFIG,
  ADDON_CONFIG,
  VERIFICATION_LEVELS,
  BADGE_CONFIG,
  QUALITY_SCORE_WEIGHTS,
  ABUSE_LIMITS,
  POSTING_LIMITS,
  PRODUCT_SKUS,
  MONETIZED_CATEGORIES,
  EXPIRY_NOTIFICATIONS,
  DEFAULT_CAPS,
  DEFAULT_DEMAND_MULTIPLIERS,
  DURATION_FACTORS,
};
