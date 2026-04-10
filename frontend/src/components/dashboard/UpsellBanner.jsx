import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Crown, 
  Sparkles, 
  Zap,
  ChevronRight,
  X,
  Star,
  AlertTriangle,
  Clock,
  RefreshCw,
  Rocket
} from 'lucide-react';
import { 
  getHighestPriorityBanner, 
  BANNER_CONFIGS
} from '../../constants/bannerConfig';

/**
 * Upsell Copy Constants
 * Vivastreet-style messaging for boost products
 */
const UPSELL_COPY = {
  FEATURED: {
    headline: "Get Featured Listing",
    subhead: "Be seen first — homepage exposure & top positions",
    cta: "Boost to Featured",
    benefits: ["Homepage exposure", "Top positions in category", "Premium badge"],
    urgency: "Only {remaining} Featured spots left in your area",
    price: "£29.99/week",
  },
  PRIORITY_PLUS: {
    headline: "Get Priority Plus",
    subhead: "Frequent position refresh — stay near the top",
    cta: "Get Priority Plus",
    benefits: ["Frequent position refresh", "Stays near top", "Priority over Priority Listing"],
    urgency: "New profiles are taking your spot",
    price: "£16.99/week",
  },
  TAP_UP: {
    headline: "Auto-Bump with Tap Up",
    subhead: "Stay at the top automatically",
    cta: "Activate Tap Up",
    benefits: ["Auto-bump every 6-12 hours", "Set and forget", "Never fall behind"],
    urgency: "While you sleep, your ad stays visible",
    price: "From £9.99/week",
  },
  HIGHLIGHT: {
    headline: "Highlight Your Ad",
    subhead: "Coloured background that catches eyes",
    cta: "Add Highlight",
    benefits: ["Coloured background", "Stands out in listings", "Works with any tier"],
    urgency: "Get noticed in a crowded feed",
    price: "£6.99/week",
  },
};

/**
 * Status Banner Icons Map
 */
const STATUS_ICONS = {
  underReview: Clock,
  expired: AlertTriangle,
  expiring12h: AlertTriangle,
  expiring48h: Clock,
  bumpReady: RefreshCw,
  noBoost: Rocket,
};

/**
 * UpsellBanner Component
 * 
 * Priority-ordered banner for seller dashboard
 * Shows the most relevant upsell based on current ad status
 */
const UpsellBanner = ({
  ad,
  variant = 'full', // 'full' | 'compact' | 'inline'
  onDismiss,
  remainingVipSpots,
  className = '',
}) => {
  // Determine which upsell to show based on ad state
  const getUpsellType = () => {
    if (!ad) return 'PRIORITY_PLUS';
    
    // Priority order: Featured > Priority Plus > Tap Up > Highlight
    if (ad.tier === 'STANDARD' || ad.tier === 'PRIORITY') {
      // First, try to upsell to a tier
      if (remainingVipSpots > 0 && remainingVipSpots < 10) {
        return 'FEATURED'; // Show Featured if spots are limited
      }
      return 'PRIORITY_PLUS'; // Default to Priority Plus
    }
    
    if (ad.tier === 'PRIORITY_PLUS' && !ad.hasTapUp) {
      return 'TAP_UP'; // Already Priority Plus, upsell Tap Up
    }
    
    if (ad.tier === 'PRIORITY_PLUS' && ad.hasTapUp) {
      return 'FEATURED'; // Has Priority Plus + Tap Up, go for Featured
    }
    
    if (ad.tier === 'FEATURED' && !ad.hasTapUp) {
      return 'TAP_UP'; // Featured without Tap Up
    }
    
    // Already has everything, suggest Highlight
    if (!ad.hasActiveGlow) {
      return 'HIGHLIGHT';
    }
    
    return null; // Nothing to upsell
  };

  const upsellType = getUpsellType();
  
  if (!upsellType) return null;
  
  const copy = UPSELL_COPY[upsellType];
  const Icon = upsellType === 'FEATURED' ? Crown 
    : upsellType === 'TAP_UP' ? Zap 
    : upsellType === 'HIGHLIGHT' ? Sparkles 
    : Star;

  const bgGradient = upsellType === 'FEATURED' 
    ? 'from-amber-500/20 to-yellow-500/10 border-amber-400/30'
    : upsellType === 'TAP_UP'
    ? 'from-purple-500/20 to-indigo-500/10 border-purple-400/30'
    : upsellType === 'HIGHLIGHT'
    ? 'from-pink-500/20 to-rose-500/10 border-pink-400/30'
    : 'from-brand-500/20 to-accent-500/10 border-brand-400/30';

  const iconBg = upsellType === 'FEATURED'
    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
    : upsellType === 'TAP_UP'
    ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
    : upsellType === 'HIGHLIGHT'
    ? 'bg-gradient-to-r from-pink-500 to-rose-500'
    : 'bg-gradient-to-r from-brand-500 to-accent-500';

  const buttonBg = upsellType === 'FEATURED'
    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500'
    : upsellType === 'TAP_UP'
    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'
    : upsellType === 'HIGHLIGHT'
    ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
    : 'bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600';

  if (variant === 'compact') {
    return (
      <div className={`relative p-3 rounded-lg bg-gradient-to-r ${bgGradient} border ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{copy.headline}</p>
            <p className="text-xs text-gray-400">{copy.price}</p>
          </div>
          <Link
            to={`/boost/${ad?._id || 'select'}?type=${upsellType}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white ${buttonBg} transition-all`}
          >
            {copy.cta}
          </Link>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <Link
        to={`/boost/${ad?._id || 'select'}?type=${upsellType}`}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${bgGradient} border hover:scale-[1.02] transition-all ${className}`}
      >
        <Icon className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-white">{copy.headline}</span>
        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
      </Link>
    );
  }

  // Full variant
  return (
    <div className={`relative p-4 md:p-6 rounded-xl bg-gradient-to-r ${bgGradient} border ${className}`}>
      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-xl ${iconBg} w-fit`}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">
            {copy.headline}
          </h3>
          <p className="text-sm text-gray-300 mb-2">
            {copy.subhead}
          </p>
          
          {/* Benefits */}
          <div className="flex flex-wrap gap-2 mb-3">
            {copy.benefits.map((benefit, index) => (
              <span 
                key={index}
                className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300"
              >
                ✓ {benefit}
              </span>
            ))}
          </div>

          {/* Urgency */}
          {remainingVipSpots && upsellType === 'FEATURED' && (
            <p className="text-sm text-amber-400 font-medium">
              ⚡ {copy.urgency.replace('{remaining}', remainingVipSpots)}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="text-sm text-gray-400">{copy.price}</span>
          <Link
            to={`/boost/${ad?._id || 'select'}?type=${upsellType}`}
            className={`px-4 py-2 rounded-lg font-medium text-white ${buttonBg} transition-all flex items-center gap-2`}
          >
            {copy.cta}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

/**
 * UpsellCard Component
 * Individual product card for boost selection page
 */
export const UpsellCard = ({
  type, // 'FEATURED' | 'PRIORITY_PLUS' | 'TAP_UP' | 'HIGHLIGHT'
  price,
  selected = false,
  onSelect,
  disabled = false,
  soldOut = false,
}) => {
  const copy = UPSELL_COPY[type];
  if (!copy) return null;

  const Icon = type === 'FEATURED' ? Crown 
    : type === 'TAP_UP' ? Zap 
    : type === 'HIGHLIGHT' ? Sparkles 
    : Star;

  const borderColor = selected
    ? type === 'FEATURED' ? 'border-amber-400' 
      : type === 'TAP_UP' ? 'border-purple-400'
      : type === 'HIGHLIGHT' ? 'border-pink-400'
      : 'border-brand-400'
    : 'border-surface-600';

  return (
    <button
      onClick={() => !disabled && !soldOut && onSelect?.(type)}
      disabled={disabled || soldOut}
      className={`relative w-full p-4 rounded-xl border-2 ${borderColor} 
                  bg-surface-800 hover:bg-surface-700 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all text-left`}
    >
      {/* Selected Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}

      {/* Sold Out Badge */}
      {soldOut && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded">
          Sold Out
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          type === 'FEATURED' ? 'bg-amber-500/20' 
          : type === 'TAP_UP' ? 'bg-purple-500/20'
          : type === 'HIGHLIGHT' ? 'bg-pink-500/20'
          : 'bg-brand-500/20'
        }`}>
          <Icon className={`w-5 h-5 ${
            type === 'FEATURED' ? 'text-amber-400' 
            : type === 'TAP_UP' ? 'text-purple-400'
            : type === 'HIGHLIGHT' ? 'text-pink-400'
            : 'text-brand-400'
          }`} />
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-white">{copy.headline}</h4>
          <p className="text-sm text-gray-400">{copy.subhead}</p>
          <p className="text-lg font-semibold text-brand-400 mt-2">
            {price || copy.price}
          </p>
        </div>
      </div>
    </button>
  );
};

/**
 * StatusBanner Component
 * Priority-ordered status banner for ad dashboard
 * Shows status-based messages (underReview, expired, expiring, etc.)
 * 
 * Priority order (highest first):
 * 1. underReview - Ad pending moderation
 * 2. expired - Tier just expired
 * 3. expiring12h - Expires in < 12h (urgent)
 * 4. expiring48h - Expires in < 48h (warning)
 * 5. bumpReady - Tumble Up available
 * 6. noBoost - Standard tier, upsell
 */
export const StatusBanner = ({ ad, onDismiss, className = '' }) => {
  // Build ad state for priority calculation
  const adState = {
    status: ad?.status || 'pending',
    tier: ad?.tier || 'STANDARD',
    tierUntil: ad?.tierUntil ? new Date(ad.tierUntil) : null,
    pulseCooldownUntil: ad?.pulseCooldownUntil ? new Date(ad.pulseCooldownUntil) : null,
    hasTapUp: ad?.hasTapUp || false,
  };
  
  const banner = getHighestPriorityBanner(adState);
  
  if (!banner) return null;
  
  const config = BANNER_CONFIGS[banner];
  const StatusIcon = STATUS_ICONS[banner] || Clock;
  
  // Style mapping for different banner types
  const styleMap = {
    underReview: {
      bg: 'from-blue-500/20 to-cyan-500/10 border-blue-400/30',
      iconBg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      button: 'bg-blue-500 hover:bg-blue-600',
    },
    expired: {
      bg: 'from-red-500/20 to-orange-500/10 border-red-400/30',
      iconBg: 'bg-gradient-to-r from-red-500 to-orange-500',
      button: 'bg-red-500 hover:bg-red-600',
    },
    expiring12h: {
      bg: 'from-red-500/20 to-amber-500/10 border-red-400/30',
      iconBg: 'bg-gradient-to-r from-red-500 to-amber-500',
      button: 'bg-red-500 hover:bg-red-600',
    },
    expiring48h: {
      bg: 'from-amber-500/20 to-yellow-500/10 border-amber-400/30',
      iconBg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
      button: 'bg-amber-500 hover:bg-amber-600',
    },
    bumpReady: {
      bg: 'from-green-500/20 to-emerald-500/10 border-green-400/30',
      iconBg: 'bg-gradient-to-r from-green-500 to-emerald-500',
      button: 'bg-green-500 hover:bg-green-600',
    },
    noBoost: {
      bg: 'from-brand-500/20 to-accent-500/10 border-brand-400/30',
      iconBg: 'bg-gradient-to-r from-brand-500 to-accent-500',
      button: 'bg-brand-500 hover:bg-brand-600',
    },
  };
  
  const style = styleMap[banner] || styleMap.noBoost;
  
  // Get remaining time for expiry banners
  const getTimeRemaining = () => {
    if (!adState.tierUntil) return '';
    const now = new Date();
    const diff = adState.tierUntil.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} minutes`;
  };
  
  // Get description with dynamic time
  const getDescription = () => {
    let desc = config.description;
    if (banner === 'expiring12h' || banner === 'expiring48h') {
      desc = desc.replace('{time}', getTimeRemaining());
    }
    return desc;
  };
  
  // Get CTA route
  const getCtaRoute = () => {
    let route = config.ctaRoute;
    if (route && ad?._id) {
      route = route.replace('{adId}', ad._id);
    }
    return route || '#';
  };

  return (
    <div className={`relative p-4 rounded-xl bg-gradient-to-r ${style.bg} border ${className}`}>
      {/* Dismiss Button (only for non-critical) */}
      {onDismiss && banner !== 'expired' && banner !== 'expiring12h' && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Icon */}
        <div className={`p-2.5 rounded-xl ${style.iconBg} w-fit`}>
          <StatusIcon className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="text-base font-semibold text-white">
            {config.title}
          </h4>
          <p className="text-sm text-gray-300 mt-0.5">
            {getDescription()}
          </p>
        </div>

        {/* CTA */}
        {config.ctaText && (
          <Link
            to={getCtaRoute()}
            className={`px-4 py-2 rounded-lg font-medium text-white ${style.button} transition-all flex items-center gap-2 whitespace-nowrap`}
          >
            {config.ctaText}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default UpsellBanner;
