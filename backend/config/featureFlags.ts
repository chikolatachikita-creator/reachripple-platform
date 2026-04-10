/**
 * Feature Flags System
 * 
 * Critical for:
 * - Gradual rollout
 * - A/B testing
 * - Emergency disable
 * 
 * Usage:
 * ```ts
 * import { flags, isEnabled } from './config/featureFlags';
 * 
 * if (isEnabled('promotedAds')) {
 *   // Show promoted ads section
 * }
 * ```
 */

import { logInfo, logWarn } from "../utils/logger";

// ============================================
// FEATURE FLAG DEFINITIONS
// ============================================

export interface FeatureFlags {
  // Monetization features
  promotedAds: boolean;              // Show promoted/paid ads section
  paidTiers: boolean;                // Enable paid tier purchases
  paidBumps: boolean;                // Enable paid bump purchases
  websiteLinks: boolean;             // Enable paid website links
  
  // Trust & safety features
  riskScoring: boolean;              // Enable risk score calculations
  duplicateDetection: boolean;       // Check for duplicate images
  locationMismatchCheck: boolean;    // Flag IP vs postcode mismatches
  profileCompleteness: boolean;      // Calculate completeness score
  
  // Ranking features
  rankingBuckets: boolean;           // Use PROMOTED/VERIFIED/STANDARD/LOW-QUALITY buckets
  qualityScoreRanking: boolean;      // Use quality score in ranking
  engagementRanking: boolean;        // Factor in views/clicks for ranking
  
  // Performance features
  aggressiveCaching: boolean;        // Use aggressive Redis caching
  slowQueryLogging: boolean;         // Log queries > 300ms
  metricsTracking: boolean;          // Track search/post metrics
  
  // UI features
  verifiedBadge: boolean;            // Show verified badge on profiles
  newArrivalsSection: boolean;       // Show new arrivals section
  trendingSection: boolean;          // Show trending section
  
  // Experimental features
  aiDescriptions: boolean;           // AI-powered description suggestions
  instantMessaging: boolean;         // Real-time messaging
  videoProfiles: boolean;            // Allow video uploads
}

// Default flag values
const defaultFlags: FeatureFlags = {
  // Monetization - off by default, enable when ready
  promotedAds: false,
  paidTiers: false,
  paidBumps: false,
  websiteLinks: false,
  
  // Trust & safety - on by default for protection
  riskScoring: true,
  duplicateDetection: true,
  locationMismatchCheck: true,
  profileCompleteness: true,
  
  // Ranking - on by default for quality
  rankingBuckets: true,
  qualityScoreRanking: true,
  engagementRanking: true,
  
  // Performance - on by default
  aggressiveCaching: true,
  slowQueryLogging: true,
  metricsTracking: true,
  
  // UI - on by default
  verifiedBadge: true,
  newArrivalsSection: true,
  trendingSection: true,
  
  // Experimental - off by default
  aiDescriptions: false,
  instantMessaging: true,
  videoProfiles: true,
};

// ============================================
// FLAG MANAGEMENT
// ============================================

// Runtime flag overrides (can be updated without restart)
let runtimeOverrides: Partial<FeatureFlags> = {};

/**
 * Get current feature flags (merges defaults + env + runtime overrides)
 */
export function getFlags(): FeatureFlags {
  const envOverrides: Partial<FeatureFlags> = {};
  
  // Check environment variables for overrides
  // Format: FEATURE_FLAG_PROMOTED_ADS=true
  Object.keys(defaultFlags).forEach((key) => {
    const envKey = `FEATURE_FLAG_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      envOverrides[key as keyof FeatureFlags] = envValue === "true" || envValue === "1";
    }
  });
  
  return {
    ...defaultFlags,
    ...envOverrides,
    ...runtimeOverrides,
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isEnabled(flag: keyof FeatureFlags): boolean {
  const flags = getFlags();
  return flags[flag] ?? false;
}

/**
 * Set a runtime override (useful for A/B testing or emergency disable)
 */
export function setFlag(flag: keyof FeatureFlags, value: boolean): void {
  logInfo(`Feature flag ${flag} set to ${value}`, { flag, value });
  runtimeOverrides[flag] = value;
}

/**
 * Clear all runtime overrides
 */
export function clearOverrides(): void {
  logInfo("Clearing all feature flag overrides");
  runtimeOverrides = {};
}

/**
 * Get all flags for debugging/admin panel
 */
export function getAllFlags(): FeatureFlags & { _overrides: Partial<FeatureFlags> } {
  return {
    ...getFlags(),
    _overrides: runtimeOverrides,
  };
}

// Export singleton for convenience
export const flags = new Proxy({} as FeatureFlags, {
  get: (_, prop: string) => {
    if (prop in defaultFlags) {
      return isEnabled(prop as keyof FeatureFlags);
    }
    return undefined;
  },
});

export default { 
  flags, 
  getFlags, 
  isEnabled, 
  setFlag, 
  clearOverrides, 
  getAllFlags 
};
