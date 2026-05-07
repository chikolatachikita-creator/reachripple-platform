import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify';
import api from '../api/client';
import { useToastContext } from '../context/ToastContextGlobal';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl, proxyImage } from '../config/api';
import { useReportModal } from '../components/trust/ReportModal';
import AdCard from '../components/AdCard';
import Footer from '../components/Footer';

const getImageUrl = (path) => getAssetUrl(path);

// Category icon + colour map for placeholder images
const CATEGORY_META = {
  'buy-sell':           { icon: '🛒', color: 'from-blue-400 to-cyan-500',    label: 'Buy & Sell' },
  'vehicles':           { icon: '🚗', color: 'from-slate-500 to-zinc-600',   label: 'Vehicles' },
  'cars':               { icon: '🚗', color: 'from-slate-500 to-zinc-600',   label: 'Cars' },
  'property':           { icon: '🏠', color: 'from-emerald-400 to-teal-500', label: 'Property' },
  'jobs':               { icon: '💼', color: 'from-violet-400 to-purple-500', label: 'Jobs' },
  'services':           { icon: '🔧', color: 'from-orange-400 to-amber-500', label: 'Services' },
  'community':          { icon: '🤝', color: 'from-pink-400 to-rose-500',    label: 'Community' },
  'farming':            { icon: '🚜', color: 'from-green-400 to-lime-500',   label: 'Farming' },
  'electronics':        { icon: '💻', color: 'from-blue-500 to-indigo-600',  label: 'Electronics' },
  'furniture':          { icon: '🛋️', color: 'from-amber-400 to-yellow-500', label: 'Furniture' },
  'fashion':            { icon: '👗', color: 'from-pink-400 to-fuchsia-500', label: 'Fashion' },
  'sports':             { icon: '⚽', color: 'from-green-400 to-emerald-500', label: 'Sports' },
  'default':            { icon: '📦', color: 'from-zinc-400 to-zinc-500',    label: 'Listing' },
};

function getCategoryMeta(category) {
  if (!category) return CATEGORY_META.default;
  const slug = String(category).toLowerCase().replace(/[\s_&]+/g, '-');
  return CATEGORY_META[slug] || CATEGORY_META.default;
}

function ImagePlaceholder({ category, className = '' }) {
  const meta = getCategoryMeta(category);
  return (
    <div className={`bg-gradient-to-br ${meta.color} flex flex-col items-center justify-center gap-2 ${className}`}>
      <span className="text-5xl">{meta.icon}</span>
      <span className="text-white/80 text-sm font-medium">{meta.label}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <nav className="bg-white border-b border-zinc-200 h-16 px-4 flex items-center">
        <div className="w-32 h-6 bg-zinc-200 rounded animate-pulse" />
      </nav>
      <div className="max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="h-4 w-64 bg-zinc-200 rounded animate-pulse mb-8" />
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="h-80 bg-zinc-200 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-zinc-200 rounded-xl animate-pulse" />)}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 w-3/4 bg-zinc-200 rounded animate-pulse" />
            <div className="h-6 w-1/3 bg-zinc-200 rounded animate-pulse" />
            <div className="h-24 bg-zinc-200 rounded-xl animate-pulse" />
            <div className="h-12 bg-zinc-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function ListingProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { isLoggedIn } = useAuth();
  const { openReportModal, ReportModal } = useReportModal({ showToast });

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [similarListings, setSimilarListings] = useState([]);
  const [contactOpen, setContactOpen] = useState(false);
  // Track which gallery indexes failed to load so we can swap to placeholder
  const [brokenImages, setBrokenImages] = useState(() => new Set());

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get(`/ads/${id}`);
        const data = response.data;
        const gallery = [];
        if (data.images?.length > 0) data.images.forEach((img) => gallery.push(proxyImage(getImageUrl(img), 1200)));
        setProfile({ ...data, gallery });
        api.post('/analytics/view', { adId: id }).catch(() => {});
        if (isLoggedIn) {
          try {
            const savedRes = await api.get('/saved-profiles');
            const savedIds = (savedRes.data.savedProfiles || []).map(sp => sp.adId?._id || sp.adId);
            setSaved(savedIds.includes(id));
          } catch { /* ignore */ }
        }
      } catch (err) {
        setError(err.message || 'Failed to load listing');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Escort/adult categories that must never appear in similar listings on non-escort pages
  const ADULT_CATEGORIES = new Set([
    'escorts', 'escort', 'trans-escorts', 'gay-escorts',
    'adult-entertainment', 'adult-dating', 'free-personals',
  ]);

  // Fetch similar listings
  useEffect(() => {
    if (!profile?._id) return;
    api.get('/ads', { params: { limit: 20, status: 'approved' } })
      .then(({ data }) => {
        const all = data.ads || data || [];
        const filtered = all.filter(a =>
          a._id !== id &&
          !ADULT_CATEGORIES.has((a.category || '').toLowerCase().trim())
        );
        setSimilarListings(filtered.slice(0, 4));
      })
      .catch(() => {});
  }, [profile?._id, id]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') setActiveImage(p => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setActiveImage(p => Math.min((profile?.gallery?.length || 1) - 1, p + 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, profile?.gallery?.length]);

  const handleSave = useCallback(async () => {
    if (!isLoggedIn) { showToast('Please log in to save listings'); return; }
    // Optimistic UI: flip immediately, revert on error
    const wasSaved = saved;
    setSaved(!wasSaved);
    showToast(wasSaved ? 'Removed from saved' : '💖 Saved to your list!');
    try {
      if (wasSaved) {
        await api.delete(`/saved-profiles/${id}`);
      } else {
        await api.post('/saved-profiles', { adId: id });
      }
    } catch {
      setSaved(wasSaved);
      showToast('Failed to update saved');
    }
  }, [saved, id, showToast, isLoggedIn]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('✨ Link copied!');
      }
    } catch { /* ignore */ }
  };

  if (loading) return <LoadingScreen />;
  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
        <span className="text-5xl">😕</span>
        <h1 className="text-2xl font-bold text-zinc-800">Listing not found</h1>
        <p className="text-zinc-500">{error || 'This listing may have been removed.'}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-700 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const meta = getCategoryMeta(profile.category);
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : 'Recently';
  const categorySlug = String(profile.category || '')
    .trim().toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const safeDescription = profile.description
    ? DOMPurify.sanitize(profile.description)
    : null;
  const hasGallery = profile.gallery?.length > 0;
  const displayPrice = profile.price ? `£${Number(profile.price).toLocaleString('en-GB')}` : null;
  const displayPhone = profile.phone || profile.contactPhone || null;

  const seoTitle = `${profile.title}${displayPrice ? ` — ${displayPrice}` : ''} | ReachRipple`;
  const seoDescRaw = (profile.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const seoDesc = seoDescRaw.length > 160 ? seoDescRaw.slice(0, 157) + '…' : (seoDescRaw || `${meta.label} listing on ReachRipple — Premium Classifieds & Services.`);
  const seoImage = profile.gallery?.[0] ? getImageUrl(profile.gallery[0]) : null;
  const canonicalUrl = typeof window !== 'undefined' ? `${window.location.origin}/listing/${profile._id || ''}` : '';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        {seoImage && <meta property="og:image" content={seoImage} />}
        <meta name="twitter:card" content={seoImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        {seoImage && <meta name="twitter:image" content={seoImage} />}
      </Helmet>
      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <img src="/logomark.png" alt="ReachRipple" className="w-9 h-9 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow" />
            <span className="hidden sm:block font-black text-sm">
              <span className="text-pink-500">Reach</span><span className="text-purple-600">Ripple</span>
            </span>
          </Link>

          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 min-w-0 overflow-hidden">
            <Link to="/" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex-shrink-0">Home</Link>
            <span className="flex-shrink-0">›</span>
            <Link to={`/category/${categorySlug}`} className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex-shrink-0">{meta.label}</Link>
            <span className="flex-shrink-0">›</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">{profile.title}</span>
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleShare} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all" title="Share">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              onClick={handleSave}
              className={`p-2 rounded-lg transition-all ${saved ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/30' : 'text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'}`}
              title={saved ? 'Remove from saved' : 'Save listing'}
            >
              <svg className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 sm:py-8">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">

          {/* ===== LEFT COL: Gallery ===== */}
          <div className="lg:col-span-3 space-y-3">
            {/* Main image */}
            <div
              className="relative rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 aspect-[4/3] cursor-zoom-in group"
              onClick={() => hasGallery && setLightboxOpen(true)}
            >
              {hasGallery && !brokenImages.has(activeImage) ? (
                <img
                  src={profile.gallery[activeImage]}
                  alt={profile.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={() => setBrokenImages((prev) => new Set(prev).add(activeImage))}
                />
              ) : (
                <ImagePlaceholder category={profile.category} className="w-full h-full" />
              )}
              {hasGallery && profile.gallery.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {activeImage + 1} / {profile.gallery.length}
                </div>
              )}
              {hasGallery && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/40 backdrop-blur-sm rounded-full p-3 text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {profile.gallery?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {profile.gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeImage ? 'border-zinc-900 dark:border-white shadow-lg scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    {brokenImages.has(i) ? (
                      <ImagePlaceholder category={profile.category} className="w-full h-full" />
                    ) : (
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setBrokenImages((prev) => new Set(prev).add(i))}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Description — below gallery on mobile, same col on desktop */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6">
              <h2 className="font-bold text-base text-zinc-900 dark:text-white mb-3">About this listing</h2>
              {safeDescription ? (
                <div
                  className="prose prose-sm prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              ) : (
                <p className="text-zinc-400 text-sm italic">No description provided.</p>
              )}
            </div>

            {/* Category-specific fields */}
            {profile.categoryFields && Object.keys(profile.categoryFields).length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6">
                <h2 className="font-bold text-base text-zinc-900 dark:text-white mb-4">{meta.label} Details</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.entries(profile.categoryFields).map(([key, value]) => {
                    if (!value || value === '' || value === 'undefined') return null;
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
                    return (
                      <div key={key} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                        <dt className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">{label}</dt>
                        <dd className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200 capitalize">{String(value)}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            )}
          </div>

          {/* ===== RIGHT COL: Details + Actions ===== */}
          <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-24">
            {/* Status + Category badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {profile.status === 'approved' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Available
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold">
                {meta.icon} {meta.label}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight">
              {profile.title}
            </h1>

            {/* Price */}
            {displayPrice && (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-900 dark:text-white">{displayPrice}</span>
                {profile.pricing?.price_negotiable && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">(negotiable)</span>
                )}
              </div>
            )}

            {/* Location + Date */}
            <div className="flex flex-wrap gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              {profile.location && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.location}
                </span>
              )}
              {profile.createdAt && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Posted {new Date(profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* ===== CONTACT CARD ===== */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
              {/* Phone reveal */}
              {displayPhone && (
                <button
                  onClick={() => setShowPhone(true)}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/10"
                >
                  {showPhone ? (
                    <span className="tracking-widest text-base">{displayPhone}</span>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Contact Seller
                    </>
                  )}
                </button>
              )}

              {/* Contact via email / message */}
              {!displayPhone && (
                <button
                  onClick={() => {
                    if (!isLoggedIn) { showToast('Please log in to contact the seller'); return; }
                    setContactOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Seller
                </button>
              )}

              {/* WhatsApp if phone present */}
              {showPhone && displayPhone && (
                <a
                  href={`https://wa.me/${displayPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm bg-[#25D366] text-white hover:bg-[#20ba59] active:scale-[0.98] transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              )}

              {/* Save + Share row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSave}
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all border ${saved ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 border-rose-200 dark:border-rose-800' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'}`}
                >
                  <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {saved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
            </div>

            {/* ===== SELLER CARD ===== */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Seller</h3>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {(profile.user?.name || profile.sellerName || 'S')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                    {profile.user?.name || profile.sellerName || 'Private Seller'}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Member since {memberSince}</p>
                </div>
                {profile.user?.idVerificationStatus === 'verified' && (
                  <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            {/* Safety tip */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
              <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">Safety tip</p>
                <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
                  Always meet in a public place. Never pay in advance to someone you haven't met. If something feels off, trust your instincts.
                </p>
              </div>
            </div>

            {/* Report link */}
            <button
              onClick={() => openReportModal(id)}
              className="w-full text-center text-xs text-zinc-400 dark:text-zinc-600 hover:text-red-500 transition-colors py-1"
            >
              🚩 Report this listing
            </button>
          </div>
        </div>

        {/* ===== SIMILAR LISTINGS ===== */}
        {similarListings.length > 0 && (
          <section className="mt-10 sm:mt-14">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">More Listings You May Like</h2>
              <Link
                to={`/category/${categorySlug}`}
                className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
              >
                View all {meta.label} <span>→</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {similarListings.map((ad) => (
                <AdCard key={ad._id} ad={ad} variant="normal" loading="lazy" />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ===== LIGHTBOX ===== */}
      {lightboxOpen && hasGallery && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 rounded-full p-2 transition-all hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {activeImage > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 rounded-full p-3 transition-all hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); setActiveImage(p => p - 1); }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {activeImage < profile.gallery.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 rounded-full p-3 transition-all hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); setActiveImage(p => p + 1); }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <img
            src={profile.gallery[activeImage]}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
            {activeImage + 1} / {profile.gallery.length}
          </div>
        </div>
      )}

      {/* Contact Modal (when no phone) */}
      {contactOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" onClick={() => setContactOpen(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-1">Contact Seller</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Send a message about: <strong className="text-zinc-700 dark:text-zinc-300">{profile.title}</strong></p>
            <textarea
              className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 bg-zinc-50 dark:bg-zinc-800 dark:text-white"
              placeholder="Hi, I'm interested in this listing..."
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setContactOpen(false)} className="flex-1 h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => { showToast('Message sent!'); setContactOpen(false); }} className="flex-1 h-11 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors">
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal />
      <Footer />
    </div>
  );
}
