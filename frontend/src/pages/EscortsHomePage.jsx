import React, { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAds } from "../api/ads";
import { getHomeData } from "../api/boost";
import { isNewArrivalAd, isTrendingAd, isGlowStyledAd } from "../utils/homeRanking";
import AdCard from "../components/AdCard";
import HeroSearchBar from "../components/search/HeroSearchBar";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import FeaturedProfilesCarousel from "../components/FeaturedProfilesCarousel";

/* =====================================================
   RESPONSIVE VIP/PRIME LIMITS HOOK
   ===================================================== */
function useVipPrimeLimits() {
  const [w, setW] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  React.useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (w < 640) return { vipLimit: 10, popularLimit: 6 };
  if (w < 1024) return { vipLimit: 12, popularLimit: 8 };
  return { vipLimit: 12, popularLimit: 8 };
}

/* =====================================================
   ANIMATED BACKGROUND COMPONENT
   ===================================================== */
const AnimatedHeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    {/* Base gradient - lowest layer */}
    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-purple-900/50 to-zinc-900 z-0" />
    
    {/* Video background - above base gradient */}
    <video
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover z-10 opacity-70"
      style={{ filter: 'blur(12px)' }}
    >
      <source src="/hero-video.mp4" type="video/mp4" />
    </video>
    
    {/* Animated gradient orbs - above video */}
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse z-20" />
    <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse z-20" style={{ animationDelay: '1s' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse z-20" style={{ animationDelay: '0.5s' }} />
    
    {/* Transparent overlay */}
    <div className="absolute inset-0 z-30" />
  </div>
);

export default function ReachRippleHomePage() {
  // Use centralized auth hook
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // Fade in animation
  const [fadeIn, setFadeIn] = useState(false);
  
  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  // Ads state with loading
  const [, setAds] = React.useState([]);
  const [vipAds, setVipAds] = React.useState([]);
  const [featuredAds, setFeaturedAds] = React.useState([]);
  const [standardAds, setStandardAds] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // VIP carousel refs + state
  const vipRailRef = useRef(null);
  const [vipActiveIndex, setVipActiveIndex] = React.useState(0);

  // Reduced motion preference
  const [reduceMotion, setReduceMotion] = React.useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(!!mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Fetch homepage data using server-side tier ranking
  const fetchAds = async (retryCount = 0) => {
    setIsLoading(true);
    try {
      const data = await getHomeData('', 50, 'escort');
      // Server returns { vip, featured, standard, totalCount, ... } inside data
      const homeData = data?.data || data || {};
      setVipAds(homeData.vip || []);
      setFeaturedAds(homeData.featured || []);
      setStandardAds(homeData.standard || []);
      // Also keep all ads combined for components that need it
      setAds([...(homeData.vip || []), ...(homeData.featured || []), ...(homeData.standard || [])]);
    } catch (err) {
      console.error("Failed to fetch homepage data:", err);
      // Fallback to basic getAds if /api/home fails
      try {
        const fallback = await getAds({ status: "approved", limit: 40, category: "escort" });
        const allAds = fallback.ads || [];
        setAds(allAds);
        setVipAds(allAds.filter(a => a.boostTier === 'FEATURED').slice(0, 12));
        setFeaturedAds(allAds.filter(a => a.boostTier === 'PRIORITY_PLUS').slice(0, 8));
        setStandardAds(allAds.filter(a => !['FEATURED', 'PRIORITY_PLUS'].includes(a.boostTier)));
      } catch (fallbackErr) {
        console.error("Fallback fetch also failed:", fallbackErr);
        // Retry once after 3s (handles Render cold starts)
        if (retryCount < 2) {
          setTimeout(() => fetchAds(retryCount + 1), 3000);
          return; // Don't set isLoading false yet
        }
        setAds([]);
        setVipAds([]);
        setFeaturedAds([]);
        setStandardAds([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  // Build VIP, Popular lists from server-ranked data
  const { vipLimit, popularLimit } = useVipPrimeLimits();

  const vipRow = useMemo(() => vipAds.slice(0, vipLimit), [vipAds, vipLimit]);
  const vipTotal = vipAds.length;
  const popularRow = useMemo(() => featuredAds.slice(0, popularLimit), [featuredAds, popularLimit]);
  const popularTotal = featuredAds.length;
  const standardFeed = standardAds;

  // Standard feed pagination
  const [feedPage, setFeedPage] = useState(1);
  const FEED_PAGE_SIZE = 12;
  const displayedFeed = useMemo(() => standardFeed.slice(0, feedPage * FEED_PAGE_SIZE), [standardFeed, feedPage]);
  const hasMoreFeed = displayedFeed.length < standardFeed.length;

  // VIP carousel scroll tracking
  useEffect(() => {
    const el = vipRailRef.current;
    if (!el) return;

    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const children = Array.from(el.children);
        if (!children.length) return;

        const left = el.scrollLeft;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < children.length; i++) {
          const dist = Math.abs(children[i].offsetLeft - left);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        setVipActiveIndex(bestIdx);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [vipRow.length]);

  const scrollVipToIndex = useCallback(
    (index) => {
      const el = vipRailRef.current;
      if (!el) return;
      const children = Array.from(el.children);
      const target = children[index];
      if (!target) return;
      el.scrollTo({
        left: target.offsetLeft,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [reduceMotion]
  );

  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 text-zinc-800 dark:text-zinc-200 pb-24 sm:pb-20 transition-all duration-500 ${fadeIn ? "opacity-100" : "opacity-0 translate-y-2"}`}>
      {/* ===================================================== */}
      {/* NAVBAR - Using shared component */}
      {/* ===================================================== */}
      <Navbar showSaved={!isLoggedIn} />

      {/* ===================================================== */}
      {/* HERO SECTION - Premium design with animated background */}
      {/* ===================================================== */}
      <section className="relative w-full min-h-[480px] sm:min-h-[550px] md:min-h-[600px] overflow-hidden">
        <AnimatedHeroBackground />

        <div className="relative z-40 flex flex-col items-center justify-center min-h-[480px] sm:min-h-[550px] md:min-h-[600px] text-center px-4 py-6 sm:py-8 md:py-12">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            500+ Verified Profiles Online
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tight leading-[1.2] drop-shadow-lg">
            Find Your Perfect
          </h1>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mt-2 drop-shadow-lg">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Desired Fantasy Companion
            </span>
          </h2>
          
          <p className="mt-4 sm:mt-6 text-white/90 text-base sm:text-lg md:text-xl lg:text-2xl max-w-2xl px-2 leading-relaxed font-semibold">
            Not just any companion. <span className="text-pink-300">Your perfect one.</span>
          </p>
          
          <p className="mt-3 text-white/70 text-base sm:text-lg max-w-xl px-2">
            The UK's most trusted escort directory. Verified, reviewed and locally focused.
          </p>
          
          {/* Quick action buttons */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/escort/gb"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-white font-bold text-base
                         bg-gradient-to-r from-pink-500 to-pink-600 shadow-lg shadow-pink-500/40
                         hover:shadow-pink-500/60 hover:scale-[1.05] active:scale-[0.97] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Profiles
            </Link>
            <button
              onClick={() => navigate(isLoggedIn ? '/create-ad' : '/login')}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-white font-bold text-base
                         bg-white/10 backdrop-blur-sm border border-white/30
                         hover:bg-white/20 active:scale-[0.97] transition-all cursor-pointer"
            >
              <span className="text-lg">+</span> Advertise Now
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* SEARCH BAR - Premium search form with all filters */}
      {/* ===================================================== */}
      <section className="relative z-[45] -mt-8 sm:-mt-12 md:-mt-16 lg:-mt-20 px-4 sm:px-6 mb-8 sm:mb-12">
        <div className="max-w-5xl mx-auto">
          <HeroSearchBar
            categorySlug="escort"
            defaultDistance={10}
            onNavigate={(url) => navigate(url)}
            loadLastLocation={true}
          />
        </div>
      </section>

      {/* ===================================================== */}
      {/* FEATURED CAROUSEL SECTION */}
      {/* ===================================================== */}
      {!isLoading && vipRow.length > 0 && (
        <section className="mb-12 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-zinc-900 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent inline-block">
              Featured Profiles
            </h2>
            <FeaturedProfilesCarousel 
              profiles={vipRow.slice(0, 8)}
              autoPlayInterval={5000}
            />
          </div>
        </section>
      )}

      {/* ===================================================== */}
      {/* VIP SPOTLIGHT SECTION - Premium carousel */}
      {/* ===================================================== */}
      {(isLoading || vipRow.length > 0) && (
        <section className="mt-4 px-3 sm:px-4" aria-label="VIP Spotlight listings">
          <div className="max-w-6xl mx-auto rounded-2xl bg-white dark:bg-zinc-800/60 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden border border-amber-100 dark:border-amber-900/30">
            {/* Section header */}
            <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-amber-50 via-orange-50/50 to-transparent border-b border-amber-100/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <span className="text-white text-base">👑</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-amber-900 tracking-wide">VIP Spotlight</span>
                  <p className="text-[10px] text-amber-600">Premium verified profiles</p>
                </div>
              </div>
              {!isLoading && vipTotal > vipRow.length && (
                <Link to="/escort/gb?tier=spotlight" className="text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-all">
                  View all →
                </Link>
              )}
            </div>

            <div className="p-3 sm:p-4">
              {isLoading ? (
                /* Skeleton loading cards */
                <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar py-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-[72vw] sm:w-[45vw] md:w-[300px] flex-shrink-0 snap-start animate-pulse">
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 overflow-hidden">
                        <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-100" />
                        <div className="p-4 space-y-3">
                          <div className="h-5 bg-amber-100 rounded w-3/4" />
                          <div className="h-4 bg-amber-100 rounded w-1/2" />
                          <div className="flex gap-2">
                            <div className="h-6 bg-amber-100 rounded-full w-16" />
                            <div className="h-6 bg-amber-100 rounded-full w-20" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div
                className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar py-1"
                ref={vipRailRef}
                role="region"
                aria-label="VIP listings carousel"
              >
                {vipRow.map((ad, index) => (
                  <div key={ad._id} className="w-[72vw] sm:w-[45vw] md:w-[300px] flex-shrink-0 snap-start">
                    <AdCard
                      ad={ad}
                      variant="vip"
                      isNewArrival={isNewArrivalAd(ad)}
                      isTrending={isTrendingAd(ad)}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "low"}
                      index={index}
                    />
                  </div>
                ))}
              </div>
              )}

              {/* Carousel indicators */}
              {!isLoading && vipRow.length > 1 && (
                <div className="flex items-center justify-between px-1 mt-3">
                  <span className="text-[10px] text-amber-500/70 font-medium">← Swipe to explore →</span>
                  <div className="flex items-center gap-1.5">
                    {vipRow.slice(0, Math.min(vipRow.length, 6)).map((ad, i) => (
                      <button
                        key={ad._id}
                        type="button"
                        onClick={() => scrollVipToIndex(i)}
                        aria-label={`Go to VIP card ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === vipActiveIndex 
                            ? "bg-gradient-to-r from-amber-400 to-orange-500 w-6 shadow-sm" 
                            : "bg-amber-200 hover:bg-amber-300 w-1.5"
                        }`}
                      />
                    ))}
                    {vipRow.length > 6 && (
                      <span className="text-[10px] font-medium text-amber-500 ml-1">+{vipRow.length - 6}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===================================================== */}
      {/* FEATURED SECTION - Popular profiles */}
      {/* ===================================================== */}
      {(isLoading || (popularRow && popularRow.length > 0)) && (
        <section className="mt-6 px-3 sm:px-4">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <span className="text-white text-base">⭐</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">Featured Profiles</span>
                  <p className="text-[10px] text-zinc-500">Most popular in your area</p>
                </div>
              </div>
              {!isLoading && popularTotal > popularRow.length && (
                <Link to="/escort/gb?tier=prime" className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition-all">
                  View all →
                </Link>
              )}
            </div>

            {/* Horizontal scrolling cards */}
            <div className="-mx-3 px-3">
              {isLoading ? (
                /* Skeleton loading cards */
                <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar py-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-[60vw] sm:w-[38vw] md:w-[240px] flex-shrink-0 snap-start animate-pulse">
                      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="h-36 bg-gradient-to-br from-purple-50 to-pink-50" />
                        <div className="p-3 space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-3/4" />
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                          <div className="flex gap-1.5">
                            <div className="h-5 bg-gray-100 rounded-full w-12" />
                            <div className="h-5 bg-gray-100 rounded-full w-16" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div
                className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar py-1"
                role="region"
                aria-label="Featured listings"
              >
                {popularRow.map((ad, index) => (
                  <div key={ad._id} className="w-[60vw] sm:w-[38vw] md:w-[240px] flex-shrink-0 snap-start">
                    <AdCard
                      ad={ad}
                      variant="popular"
                      isNewArrival={isNewArrivalAd(ad)}
                      isTrending={isTrendingAd(ad)}
                      index={index}
                    />
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===================================================== */}
      {/* UPGRADE TO VIP CTA - For logged-in sellers */}
      {/* ===================================================== */}
      {localStorage.getItem('accessToken') && (
        <section className="mt-8 px-3 sm:px-4" aria-label="Upgrade your listing">
          <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 p-[2px] shadow-lg shadow-orange-500/20">
              <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  {/* Crown icon */}
                  <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-400/30">
                    <span className="text-2xl sm:text-3xl">👑</span>
                  </div>
                  
                  {/* Text content */}
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-1">
                      Upgrade to VIP Spotlight
                    </h3>
                    <p className="text-sm text-zinc-600 mb-0 sm:mb-0">
                      Get 5x more views! Your ad appears at the top of the page with premium styling.
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">✓ Top carousel placement</span>
                      <span className="flex items-center gap-1">✓ Premium badge</span>
                      <span className="flex items-center gap-1">✓ 7-day boost</span>
                    </div>
                  </div>
                  
                  {/* CTA button */}
                  <div className="flex-shrink-0">
                    <Link 
                      to="/my-ads" 
                      className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all duration-200 transform hover:scale-105"
                    >
                      <span>Upgrade Now</span>
                      <span className="text-lg">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================== */}
      {/* ALL LISTINGS FEED - STANDARD + GLOW tiers */}
      {/* ===================================================== */}
      {(isLoading || standardFeed.length > 0) && (
        <section className="mt-8 px-3 sm:px-4" aria-label="All listings">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center shadow-lg shadow-zinc-500/25">
                  <span className="text-white text-base">📋</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">All Listings</span>
                  <p className="text-[10px] text-zinc-500">{standardFeed.length} profiles available</p>
                </div>
              </div>
              <Link to="/escort/gb" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-all">
                View all →
              </Link>
            </div>

            {/* Listings Grid - Responsive columns */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                      <div className="aspect-[4/5] bg-gradient-to-br from-gray-50 to-gray-100" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {displayedFeed.map((ad, index) => (
                    <AdCard
                      key={ad._id}
                      ad={ad}
                      variant={isGlowStyledAd(ad) ? "glow" : "default"}
                      isNewArrival={isNewArrivalAd(ad)}
                      isTrending={isTrendingAd(ad)}
                      index={index}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMoreFeed && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setFeedPage(p => p + 1)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-zinc-700 font-semibold text-sm
                                 bg-white border border-zinc-200 shadow-sm
                                 hover:bg-zinc-50 hover:shadow-md active:scale-[0.98] transition-all"
                    >
                      Load More
                      <span className="text-zinc-400">({standardFeed.length - displayedFeed.length} remaining)</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ===================================================== */}
      {/* BROWSE ALL CTA - Premium gradient card */}
      {/* ===================================================== */}
      <section className="mt-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden shadow-xl">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
            
            {/* Floating orbs */}
            <div className="absolute top-4 right-8 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-4 left-8 w-16 h-16 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative p-8 sm:p-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                Explore All Profiles
              </h2>
              <p className="text-white/80 text-sm sm:text-base mb-6 max-w-md mx-auto">
                Browse hundreds of verified escorts in your area with advanced filters and instant messaging
              </p>
              <Link
                to="/escort/gb"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-purple-900 font-bold text-sm
                           bg-white shadow-xl shadow-black/10 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse All Profiles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* QUICK STATS / TRUST INDICATORS - Modern cards */}
      {/* ===================================================== */}
      <section className="mt-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Why Choose Us</h3>
            <p className="text-sm text-zinc-500 mt-1">Trusted by thousands across the UK</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: "✅", value: "500+", label: "Verified Profiles", color: "from-green-500 to-emerald-600" },
              { icon: "📍", value: "UK Wide", label: "All Areas Covered", color: "from-blue-500 to-indigo-600" },
              { icon: "⚡", value: "24/7", label: "Always Available", color: "from-amber-500 to-orange-600" },
              { icon: "🔒", value: "100%", label: "Secure & Private", color: "from-purple-500 to-pink-600" },
            ].map((stat, index) => (
              <div 
                key={stat.label} 
                className="group bg-white dark:bg-zinc-800/60 rounded-2xl p-5 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-zinc-100 dark:border-zinc-700 hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl shadow-lg mb-3`}>
                  {stat.icon}
                </div>
                <div className="text-xl font-black text-zinc-900">{stat.value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* MOBILE STICKY BOTTOM BAR - Modern floating design */}
      {/* ===================================================== */}
      <nav className="fixed left-1/2 -translate-x-1/2 bottom-4 w-[min(400px,calc(100%-32px))]
                      rounded-2xl bg-white/95 p-1.5 shadow-2xl shadow-black/15 backdrop-blur-xl border border-zinc-200/80
                      flex gap-1.5 md:hidden z-50 safe-area-bottom mobile-bottom-bar">
        <Link
          to="/escort/gb"
          className="flex-1 rounded-xl px-3 py-3 text-center font-semibold text-sm
                     bg-zinc-50 text-zinc-700 hover:bg-zinc-100
                     active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </Link>
        <Link
          to="/escort/gb"
          className="flex-1 rounded-xl px-3 py-3 text-center font-bold text-sm
                     bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25
                     active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          Browse All
        </Link>
        <button
          onClick={() => navigate(isLoggedIn ? '/create-ad' : '/login')}
          className="flex-1 rounded-xl px-3 py-3 text-center font-semibold text-sm
                     bg-zinc-50 text-zinc-700 hover:bg-zinc-100
                     active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>+</span> Post
        </button>
      </nav>

      {/* ===================================================== */}
      {/* FOOTER - Clean modern design */}
      {/* ===================================================== */}
      <footer className="border-t border-zinc-100 bg-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logomark.png" alt="ReachRipple" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-sm font-medium text-zinc-600">© 2026 <span className="text-pink-500">Reach</span><span className="text-purple-600">Ripple</span></span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Privacy</Link>
              <Link to="/terms" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Terms</Link>
              <Link to="/help" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Help</Link>
              <Link to="/contact" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Contact</Link>
            </div>
          </div>
          <p className="text-center text-[11px] text-zinc-400 mt-4">
            ReachRipple is an advertising platform only. We do not operate as an agency or escort service.
          </p>
        </div>
      </footer>
    </div>
  );
}
