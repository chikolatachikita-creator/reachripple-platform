import React, { useState, memo } from 'react'; // Verified build 
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ProfileQuickViewModal from "./ProfileQuickViewModal";
import { getAssetUrl, proxyImage } from "../config/api";

const getImageUrl = (path) => getAssetUrl(path);

// Category-aware placeholder metadata
const PLACEHOLDER_META = {
  'escorts':            { icon: '💝', color: 'from-rose-400 to-pink-500' },
  'adult-entertainment':{ icon: '🔞', color: 'from-pink-500 to-purple-500' },
  'trans-escorts':      { icon: '💜', color: 'from-purple-400 to-violet-500' },
  'gay-escorts':        { icon: '🌈', color: 'from-pink-400 to-rose-500' },
  'adult-dating':       { icon: '💘', color: 'from-red-400 to-rose-500' },
  'buy-sell':           { icon: '🛒', color: 'from-blue-400 to-cyan-500' },
  'vehicles':           { icon: '🚗', color: 'from-slate-500 to-zinc-600' },
  'cars':               { icon: '🚗', color: 'from-slate-500 to-zinc-600' },
  'property':           { icon: '🏠', color: 'from-emerald-400 to-teal-500' },
  'jobs':               { icon: '💼', color: 'from-violet-400 to-purple-500' },
  'services':           { icon: '🔧', color: 'from-orange-400 to-amber-500' },
  'community':          { icon: '🤝', color: 'from-pink-400 to-rose-400' },
  'farming':            { icon: '🚜', color: 'from-green-400 to-lime-500' },
  'electronics':        { icon: '💻', color: 'from-blue-500 to-indigo-600' },
  'furniture':          { icon: '🛋️', color: 'from-amber-400 to-yellow-500' },
  'fashion':            { icon: '👗', color: 'from-pink-400 to-fuchsia-500' },
  'sports':             { icon: '⚽', color: 'from-green-400 to-emerald-500' },
  'default':            { icon: '📦', color: 'from-zinc-300 to-zinc-400' },
};

function getPlaceholderMeta(category) {
  if (!category) return PLACEHOLDER_META.default;
  const slug = String(category).toLowerCase().replace(/[\s_&]+/g, '-');
  return PLACEHOLDER_META[slug] || PLACEHOLDER_META.default;
}

/**
 * Crown SVG icon for VIP badge
 */
const CrownIcon = ({ className = "" }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/>
  </svg>
);

/**
 * Fire icon for Trending badge
 */
const FireIcon = ({ className = "" }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 23c-4.97 0-9-4.03-9-9 0-4.025 3.667-8.333 5.5-10S12 1 12 1s1.833 2.167 3.5 3.5S21 9.975 21 14c0 4.97-4.03 9-9 9zm0-17.5C10.5 7 9 9 8.5 11.5 8 14 9 16 10.5 17c-.833-1.5-.5-3.5 1.5-5 0 2 .5 4 2 5.5s2.5 2 2.5 2c1-1 2-2.5 2-5 0-3.5-2.5-6-6.5-9z"/>
  </svg>
);

/**
 * Star icon for Popular badge
 */
const StarIcon = ({ className = "" }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

/**
 * AdCard Component - Tiered Placement System (Vivastreet-style)
 * Memoized for performance: prevents unnecessary re-renders when parent updates
 * 
 * - "vip" / "featured" (FEATURED): Top carousel, bigger cards (h-56), premium gold styling
 * - "popular" / "priority_plus" (PRIORITY_PLUS): Below VIP, featured block, purple styling
 * - "glow" / "priority" (PRIORITY): Visual pop in feed (pink ring), doesn't change position
 * - "normal" / "standard" (STANDARD): Regular feed listing
 * 
 * COMPUTED BADGES (free, styling only):
 * - isTrending: Orange fire badge + border glow (computed from engagement velocity)
 * - isNewArrival: "NEW" badge (computed from createdAt < 48h)
 * 
 * PAID BADGES:
 * - NEW Label: Paid "NEW" badge (hasNewLabel, 7-day default), shows even if older than 48h
 *   → Gets gold ring around badge to distinguish from free computed NEW
 * 
 * Default durations: 7 days (matches Vivastreet pricing)
 * 
 * @param {Object} ad - The ad data
 * @param {string} variant - Card variant: "vip"|"spotlight"|"popular"|"prime"|"glow"|"highlight"|"normal"|"standard"
 * @param {boolean} isTrending - Show trending visual styling
 * @param {boolean} isNewArrival - Show NEW badge
 * @param {boolean} showThumbnails - Show additional image thumbnails (VIP only)
 * @param {string} label - Optional label text override
 * @param {string} labelTitle - Tooltip text for the label
 */
function AdCard({ 
  ad, 
  variant = "normal",
  isTrending = false,
  isNewArrival = false,
  showThumbnails = false,
  label = null,
  labelTitle = null,
  loading = "eager",  // "lazy" for below-fold images (performance)
  fetchPriority = "auto",  // "high" for first visible image (LCP optimization)
  index = 0  // For performance tracking
}) {
  const { isLoggedIn } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  // Adult content blur logic
  const ADULT_CATEGORIES = ['escorts', 'adult-entertainment', 'trans-escorts', 'gay-escorts', 'adult-dating', 'swingers', 'straight-relationships', 'gay-and-lesbian'];
  const isAdultContent = ADULT_CATEGORIES.includes(ad.category);
  const shouldBlur = !isLoggedIn && isAdultContent;

  // Determine image URL (supports string or {url} object) with full URL
  const rawImagePath =
    ad.images && ad.images.length > 0
      ? typeof ad.images[0] === "string"
        ? ad.images[0]
        : ad.images[0]?.url
      : null;
  const imageUrl = getImageUrl(rawImagePath);
  // Route external images through /api/img for resize+webp+caching+fallback.
  // Card width is ~640px on mobile and ~400px in 4-up desktop grid.
  const displayImageUrl = proxyImage(imageUrl, 800);

  // Additional thumbnails for VIP cards
  const thumbnailImages = ad.images && ad.images.length > 1 
    ? ad.images.slice(1, 4).map(img => proxyImage(getImageUrl(typeof img === "string" ? img : img?.url), 200))
    : [];

  // Variant normalization - use tier from ad data or variant prop
  const isVip = variant === "vip" || variant === "spotlight" || variant === "featured" || ad._tier === "FEATURED" || ad.tier === "FEATURED";
  const isPopular = variant === "popular" || variant === "prime" || variant === "priority_plus" || ad._tier === "PRIORITY_PLUS" || ad.tier === "PRIORITY_PLUS";
  const isGlow = variant === "glow" || variant === "highlight" || variant === "priority" || ad._tier === "PRIORITY" || ad.tier === "PRIORITY" || ad._isGlow === true;
  
  // Visual modifiers from ad data or props (computed, not stored)
  const showTrending = isTrending || ad._isTrending === true;
  // NEW badge: paid (hasNewLabel) OR computed (< 48h)
  const showNewArrival = isNewArrival || ad._isNewArrival === true || ad._hasPaidNewLabel === true;
  const isPaidNewLabel = ad._hasPaidNewLabel === true || (ad.hasNewLabel && ad.newLabelUntil && new Date(ad.newLabelUntil) > new Date());

  // Container classes based on variant
  const getContainerClasses = () => {
    const base = "block group relative rounded-2xl overflow-hidden bg-white shadow-md transition-all duration-200 cursor-pointer";
    
    if (isVip) {
      // VIP: Rose gold to gold gradient border - premium look, minimal glow
      return `${base} vip-gradient-border hover:-translate-y-1 hover:shadow-lg`;
    }
    if (isPopular) {
      // Popular: Purple-pink-navy gradient border, subtle
      return `${base} featured-gradient-border hover:-translate-y-1 hover:shadow-lg`;
    }
    if (isGlow) {
      // GLOW/Highlight: Pink ring, glowing effect - visual pop in feed
      return `${base} ring-2 ring-pink-400/60 shadow-pink-100 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-200`;
    }
    if (showTrending) {
      // Trending: Orange glow effect
      return `${base} ring-2 ring-orange-300/50 shadow-orange-100 hover:-translate-y-1 hover:shadow-xl`;
    }
    // Normal - subtle lift hover
    return `${base} hover:-translate-y-1 hover:shadow-xl ${ad.highlight ? "ring-2 ring-pink-200 shadow-pink-100" : ""}`;
  };

  // Image height based on variant - responsive for mobile.
  // We use aspect-ratio (4:3) so every card has the same shape regardless of
  // the source image dimensions; the variant only nudges the desktop max.
  const getImageWrapperClasses = () => {
    const base = "relative overflow-hidden aspect-[4/3] w-full bg-zinc-100";
    if (isVip) return `${base} md:aspect-[5/4]`; // slightly taller on desktop for VIP
    return base;
  };

  // Image classes based on variant
  const getImageClasses = () => {
    const base = "w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.06]";
    if (shouldBlur) {
      return `${base} blur-xl scale-110`;
    }
    return base;
  };

  // Adult/escort categories use /profile/:id (escort profile UI), everything else uses /listing/:id (classifieds UI)
  const ADULT_CATS = new Set(['escorts','escort','trans-escorts','gay-escorts','adult-entertainment','adult-dating','free-personals']);
  const _adSlug = String(ad.categorySlug || '').toLowerCase().trim();
  const _profileLink = ADULT_CATS.has(_adSlug) ? `/profile/${ad._id}` : `/listing/${ad._id}`;

  // Card content
  const cardContent = (
    <>
      <Link
        to={_profileLink}
        className={getContainerClasses()}
      >
        {/* Quick View Button (Top-Right) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation(); // Stop navigation to profile
            setIsQuickViewOpen(true);
          }}
          className="
            absolute top-3 right-3 z-30 p-2 rounded-full 
            bg-white/80 backdrop-blur-md text-zinc-700 
            opacity-0 group-hover:opacity-100 transition-all duration-200
            hover:bg-white hover:text-pink-600 hover:scale-110 shadow-sm
          "
          title="Quick View"
          aria-label="Quick preview of profile"
        >
          <Eye size={18} />
        </button>

        {/* Image */}
        <div className={getImageWrapperClasses()}>
          {/* Placeholder skeleton */}
          {!imageLoaded && imageUrl && !imageError && (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
          )}

          {imageUrl && !imageError ? (
          <img
            src={displayImageUrl}
            alt={ad.title}
            className={getImageClasses()}
            loading={loading}
            decoding="async"
            fetchPriority={fetchPriority || "auto"}
            onLoad={() => setImageLoaded(true)}
            onError={() => { setImageError(true); setImageLoaded(true); }}
            style={{ opacity: imageLoaded ? 1 : 0.7 }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          /* Category-aware placeholder — no image uploaded or image failed to load */
          (() => {
            const pm = getPlaceholderMeta(ad.category);
            return (
              <div className={`w-full h-full bg-gradient-to-br ${pm.color} flex flex-col items-center justify-center gap-1 select-none`}>
                <span className="text-3xl sm:text-4xl">{pm.icon}</span>
                <span className="text-white/70 text-[10px] font-semibold uppercase tracking-wide">{ad.category || 'Listing'}</span>
              </div>
            );
          })()
        )}

        {/* Adult Content Overlay */}
        {shouldBlur && imageLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
            <span className="bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
              18+ Login
            </span>
          </div>
        )}

        {/* ===== BADGES STACK (top-left) ===== */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* VIP Badge with Crown */}
          {isVip && (
            <span
              className="
                px-2 py-0.5 text-[10px] font-bold uppercase rounded-full
                bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 text-amber-900
                shadow-md flex items-center gap-1
              "
            >
              <CrownIcon className="w-3 h-3" />
              VIP
            </span>
          )}

          {/* Popular Badge with Star */}
          {isPopular && !isVip && (
            <span
              className="
                px-2 py-0.5 text-[10px] font-bold uppercase rounded-full
                bg-gradient-to-r from-purple-500 to-pink-500 text-white
                shadow-md flex items-center gap-1
              "
            >
              <StarIcon className="w-3 h-3" />
              Popular
            </span>
          )}

          {/* GLOW/Highlight Badge with Sparkle */}
          {isGlow && !isVip && !isPopular && (
            <span
              className="
                px-2 py-0.5 text-[10px] font-bold uppercase rounded-full
                bg-gradient-to-r from-pink-400 to-rose-500 text-white
                shadow-md flex items-center gap-1
              "
            >
              ✨ Highlight
            </span>
          )}

          {/* Trending Badge with Fire */}
          {showTrending && (
            <span
              className="
                px-2 py-0.5 text-[10px] font-bold uppercase rounded-full
                bg-gradient-to-r from-orange-400 to-red-500 text-white
                shadow-md flex items-center gap-1
              "
            >
              <FireIcon className="w-3 h-3" />
              Trending
            </span>
          )}

          {/* Custom Label */}
          {label && !isVip && !isPopular && !showTrending && (
            <span
              className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full shadow-sm flex items-center gap-1 bg-slate-800/80 text-white backdrop-blur-sm"
              title={labelTitle || undefined}
            >
              {label}
            </span>
          )}
        </div>

        {/* ===== TOP-RIGHT BADGES ===== */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {/* NEW Badge - Paid label gets gold ring, computed is plain */}
          {showNewArrival && (
            <span 
              className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full shadow-md ${
                isPaidNewLabel 
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white ring-2 ring-amber-300/60' 
                  : 'bg-emerald-500 text-white animate-pulse'
              }`}
              title={isPaidNewLabel ? "Paid NEW label" : "New arrival (< 48h)"}
            >
              NEW
            </span>
          )}

          {/* Approved badge (if no NEW badge) */}
          {!showNewArrival && ad.status === "approved" && !ad.badge && !label && (
            <span className="bg-emerald-500/80 text-white text-[10px] px-2 py-0.5 rounded-full">
              ✓
            </span>
          )}
        </div>

        {/* VIP Thumbnails Strip */}
        {isVip && showThumbnails && thumbnailImages.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-1">
            {thumbnailImages.map((thumb, idx) => (
              <div 
                key={idx}
                className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/80 shadow-sm"
              >
                <img 
                  src={thumb} 
                  alt="" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className={`font-semibold text-slate-800 line-clamp-1 ${isVip ? 'text-base' : 'text-sm'}`}>
          {ad.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-1 mt-1">
          {ad.location} {ad.price ? `• £${ad.price}${ad.category === 'escorts' || ad.category === 'Escorts' ? '/hr' : ''}` : ""}
        </p>
        <p className="text-[11px] text-purple-600 mt-1">{ad.category}</p>
        
        {/* Services Preview */}
        {ad.services && ad.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {ad.services.slice(0, isVip ? 4 : 3).map((service, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full text-[10px] font-medium"
              >
                {service}
              </span>
            ))}
            {ad.services.length > (isVip ? 4 : 3) && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px]">
                +{ad.services.length - (isVip ? 4 : 3)}
              </span>
            )}
          </div>
        )}

        {/* Website Link indicator (VIP extra) */}
        {ad.hasWebsiteLink && ad.websiteUrl && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-600">
            <span>🔗</span>
            <span className="truncate max-w-[150px]">{ad.websiteUrl.replace(/^https?:\/\//, '')}</span>
          </div>
        )}
      </div>
    </Link>
      
      {/* Quick View Modal */}
      <ProfileQuickViewModal 
        profile={ad}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );

  // All cards return the same content now - styling is handled in getContainerClasses
  return cardContent;
}

// Memoize for performance: only re-render if props actually change
export default memo(AdCard, (prevProps, nextProps) => {
  // Custom comparison: compare by ad._id and variant to catch changes
  return (
    prevProps.ad._id === nextProps.ad._id &&
    prevProps.variant === nextProps.variant &&
    prevProps.isTrending === nextProps.isTrending &&
    prevProps.isNewArrival === nextProps.isNewArrival &&
    prevProps.showThumbnails === nextProps.showThumbnails &&
    prevProps.index === nextProps.index
  );
});
