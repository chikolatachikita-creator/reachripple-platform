/**
 * Banner Configuration Constants
 * Priority-ordered upsell banners for seller dashboard
 * 
 * Priority order (highest first):
 * 1. underReview - Ad is being reviewed
 * 2. expired - Tier has expired
 * 3. expiring12h - Expires within 12 hours
 * 4. expiring48h - Expires within 48 hours
 * 5. bumpReady - Cooldown expired, can bump
 * 6. noBoost - Standard tier, no boost active
 */

export type BannerPriority = 
  | 'underReview'
  | 'expired'
  | 'expiring12h'
  | 'expiring48h'
  | 'bumpReady'
  | 'noBoost';

export type BannerVariant = 'warning' | 'danger' | 'success' | 'info' | 'upsell';

export interface BannerConfig {
  priority: number;
  variant: BannerVariant;
  icon: string;
  title: string;
  description: string;
  ctaText: string;
  ctaRoute: string;
  dismissable: boolean;
}

export const BANNER_CONFIGS: Record<BannerPriority, BannerConfig> = {
  underReview: {
    priority: 1,
    variant: 'warning',
    icon: '⏳',
    title: 'Your ad is under review',
    description: 'Our team is reviewing your ad. This usually takes less than 24 hours.',
    ctaText: 'View Status',
    ctaRoute: '/my-ads',
    dismissable: false,
  },
  
  expired: {
    priority: 2,
    variant: 'danger',
    icon: '⚠️',
    title: 'Your boost has expired!',
    description: 'Your listing is back in the standard feed. Renew now to regain premium visibility.',
    ctaText: 'Renew Boost',
    ctaRoute: '/boost/renew',
    dismissable: false,
  },
  
  expiring12h: {
    priority: 3,
    variant: 'danger',
    icon: '🔥',
    title: 'Boost expires in less than 12 hours!',
    description: 'Don\'t lose your premium position. Renew now to stay at the top.',
    ctaText: 'Renew Now',
    ctaRoute: '/boost/renew',
    dismissable: true,
  },
  
  expiring48h: {
    priority: 4,
    variant: 'warning',
    icon: '⏰',
    title: 'Boost expires soon',
    description: 'Your premium boost expires within 48 hours. Renew to keep your visibility.',
    ctaText: 'Renew Boost',
    ctaRoute: '/boost/renew',
    dismissable: true,
  },
  
  bumpReady: {
    priority: 5,
    variant: 'success',
    icon: '🚀',
    title: 'Ready to bump!',
    description: 'Your cooldown is over. Tumble Up now to jump back to the top of your tier.',
    ctaText: 'Tumble Up Now',
    ctaRoute: '/my-ads?action=bump',
    dismissable: true,
  },
  
  noBoost: {
    priority: 6,
    variant: 'upsell',
    icon: '✨',
    title: 'Get more visibility',
    description: 'Stand out from the crowd. Featured ads get 3x more views on average.',
    ctaText: 'Go Featured',
    ctaRoute: '/boost/purchase',
    dismissable: true,
  },
};

// Sort by priority for easy lookup
export const BANNER_PRIORITY_ORDER: BannerPriority[] = [
  'underReview',
  'expired',
  'expiring12h',
  'expiring48h',
  'bumpReady',
  'noBoost',
];

/**
 * Get the highest priority banner for a given ad state
 */
export interface AdState {
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  tier: 'FEATURED' | 'PRIORITY_PLUS' | 'PRIORITY' | 'STANDARD';
  tierUntil?: Date | string | null;
  pulseCooldownUntil?: Date | string | null;
  hasTapUp?: boolean;
}

export function getHighestPriorityBanner(ad: AdState): BannerConfig | null {
  const now = new Date();
  
  // Check conditions in priority order
  for (const bannerType of BANNER_PRIORITY_ORDER) {
    switch (bannerType) {
      case 'underReview':
        if (ad.status === 'pending') {
          return BANNER_CONFIGS.underReview;
        }
        break;
        
      case 'expired':
        if (ad.tier !== 'STANDARD' && ad.tierUntil) {
          const expiry = new Date(ad.tierUntil);
          if (expiry < now) {
            return BANNER_CONFIGS.expired;
          }
        }
        break;
        
      case 'expiring12h':
        if (ad.tier !== 'STANDARD' && ad.tierUntil) {
          const expiry = new Date(ad.tierUntil);
          const hoursUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursUntil > 0 && hoursUntil <= 12) {
            return BANNER_CONFIGS.expiring12h;
          }
        }
        break;
        
      case 'expiring48h':
        if (ad.tier !== 'STANDARD' && ad.tierUntil) {
          const expiry = new Date(ad.tierUntil);
          const hoursUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursUntil > 12 && hoursUntil <= 48) {
            return BANNER_CONFIGS.expiring48h;
          }
        }
        break;
        
      case 'bumpReady':
        // Only for premium tiers that can bump
        if (['FEATURED', 'PRIORITY_PLUS'].includes(ad.tier)) {
          if (!ad.pulseCooldownUntil) {
            return BANNER_CONFIGS.bumpReady;
          }
          const cooldownEnd = new Date(ad.pulseCooldownUntil);
          if (cooldownEnd <= now) {
            return BANNER_CONFIGS.bumpReady;
          }
        }
        break;
        
      case 'noBoost':
        if (ad.tier === 'STANDARD' && ad.status === 'approved') {
          return BANNER_CONFIGS.noBoost;
        }
        break;
    }
  }
  
  return null;
}

/**
 * ROI Estimate ranges by tier
 * Based on rolling median city+category stats
 */
export const ROI_ESTIMATES = {
  STANDARD: {
    weeklyViews: { min: 50, max: 150 },
    weeklyClicks: { min: 5, max: 20 },
    multiplier: 1.0,
  },
  PRIORITY: {
    weeklyViews: { min: 75, max: 200 },
    weeklyClicks: { min: 8, max: 30 },
    multiplier: 1.3,
  },
  PRIORITY_PLUS: {
    weeklyViews: { min: 150, max: 400 },
    weeklyClicks: { min: 20, max: 60 },
    multiplier: 2.5,
  },
  FEATURED: {
    weeklyViews: { min: 300, max: 800 },
    weeklyClicks: { min: 40, max: 120 },
    multiplier: 5.0,
  },
};

/**
 * Calculate estimated ROI range based on tier and quality factor
 */
export function calculateROIEstimate(
  tier: keyof typeof ROI_ESTIMATES,
  qualityFactor: number = 1.0, // 0.5 to 1.5 based on profile completeness
  cityMultiplier: number = 1.0 // Location demand multiplier
): { views: { min: number; max: number }; clicks: { min: number; max: number } } {
  const base = ROI_ESTIMATES[tier];
  const clampedQuality = Math.max(0.5, Math.min(1.5, qualityFactor));
  const factor = clampedQuality * cityMultiplier;
  
  return {
    views: {
      min: Math.round(base.weeklyViews.min * factor),
      max: Math.round(base.weeklyViews.max * factor),
    },
    clicks: {
      min: Math.round(base.weeklyClicks.min * factor),
      max: Math.round(base.weeklyClicks.max * factor),
    },
  };
}
