import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import api from "../api/client";
import AdCard from "../components/AdCard";
import { useToastContext } from "../context/ToastContextGlobal";
import ThemeToggle from "../components/ThemeToggle";

export default function SavedProfilesPage() {
  const { showError, showSuccess } = useToastContext();
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);
  const [sortBy, setSortBy] = useState("recent");

  // Sort ads based on selected sort option
  const sortedAds = React.useMemo(() => {
    const arr = [...ads];
    switch (sortBy) {
      case "price-asc":
        return arr.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "price-desc":
        return arr.sort((a, b) => (b.price || 0) - (a.price || 0));
      case "title":
        return arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      case "recent":
      default:
        return arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  }, [ads, sortBy]);

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  useEffect(() => {
    const fetchSavedProfiles = async () => {
      setLoading(true);
      try {
        // Use backend saved-profiles API (persisted in DB)
        const res = await api.get('/saved-profiles');
        const profiles = res.data?.savedProfiles || [];
        // Extract populated ad data
        const adData = profiles
          .filter((sp) => sp.adId) // filter out entries where ad was deleted
          .map((sp) => sp.adId);
        setAds(adData);
        setSavedProfiles(profiles);
      } catch (err) {
        // Fallback to localStorage if not logged in (401)
        if (err?.response?.status === 401) {
          const userId = localStorage.getItem("userId");
          const key = userId ? `savedProfiles_${userId}` : "savedProfiles";
          const saved = JSON.parse(localStorage.getItem(key) || "[]");
          if (saved.length > 0) {
            const validIds = saved.filter((id) => typeof id === 'string' && id.length > 0);
            const adDetails = await Promise.all(
              validIds.map((id) =>
                api.get(`/ads/${id}`).catch(() => null)
              )
            );
            setAds(adDetails.filter(Boolean).map((res) => res.data));
          }
          setSavedProfiles(saved);
        } else {
          showError("Failed to load saved profiles");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSavedProfiles();
  }, [showError]);

  const removeSaved = async (id) => {
    try {
      await api.delete(`/saved-profiles/${id}`);
      setAds(ads.filter((ad) => ad._id !== id));
      setSavedProfiles(savedProfiles.filter((sp) => 
        (typeof sp === 'string' ? sp : sp.adId?._id || sp.adId) !== id
      ));
      showSuccess("Removed from saved listings");
    } catch (err) {
      // Fallback to localStorage removal
      const userId = localStorage.getItem("userId");
      const key = userId ? `savedProfiles_${userId}` : "savedProfiles";
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      const updated = stored.filter((pid) => pid !== id);
      localStorage.setItem(key, JSON.stringify(updated));
      setAds(ads.filter((ad) => ad._id !== id));
      showSuccess("Removed from saved listings");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
        {/* Navbar skeleton */}
        <nav className="w-full bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-zinc-100">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 animate-pulse" />
              <div className="hidden sm:block space-y-1">
                <div className="h-4 bg-zinc-200 rounded w-24 animate-pulse" />
                <div className="h-3 bg-zinc-100 rounded w-16 animate-pulse" />
              </div>
            </div>
            <div className="h-10 bg-zinc-200 rounded-xl w-32 animate-pulse" />
          </div>
        </nav>
        {/* Content skeleton */}
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-200 to-purple-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 bg-zinc-200 rounded w-40 animate-pulse" />
              <div className="h-4 bg-zinc-100 rounded w-24 animate-pulse" />
            </div>
          </div>
          {/* Profile cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-zinc-100 animate-pulse">
                <div className="aspect-[3/4] bg-gradient-to-br from-zinc-200 to-zinc-100" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-zinc-200 rounded w-3/4" />
                  <div className="h-4 bg-zinc-100 rounded w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-zinc-100 rounded-full w-16" />
                    <div className="h-6 bg-pink-100 rounded-full w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 text-zinc-800 dark:text-zinc-200 transition-all duration-500 ${fadeIn ? "opacity-100" : "opacity-0 translate-y-2"}`}>
      <Helmet><title>Saved Listings | ReachRipple</title></Helmet>
      {/* Modern Navbar */}
      <nav className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50 border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow" />
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight"><span className="text-pink-500">Reach</span><span className="text-purple-600">Ripple</span></div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">Saved Listings</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold 
                         border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 
                         active:scale-[0.98] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Listings
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header section */}
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <span className="text-white text-xl">⭐</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">Saved Listings</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                {ads.length} listing{ads.length !== 1 ? "s" : ""} saved
              </p>
            </div>
          </div>
          {ads.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Sort</label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900 cursor-pointer"
              >
                <option value="recent">Recently saved</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
          )}
        </div>

        {ads.length === 0 ? (
          /* Empty state - Modern design */
          <div className="bg-white dark:bg-zinc-800/60 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-12 text-center border border-zinc-100 dark:border-zinc-700">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">💝</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-white mb-2">No Saved Listings Yet</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed">
              Start saving listings you like to keep track of your favorites and compare them later
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm
                         bg-gradient-to-r from-pink-500 to-purple-600 text-white 
                         shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 
                         hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Listings
            </Link>
          </div>
        ) : (
          /* Saved listings grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sortedAds.map((ad, index) => (
              <div 
                key={ad._id} 
                className="group relative bg-white dark:bg-zinc-800/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] 
                           hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-zinc-100 dark:border-zinc-700 
                           hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <AdCard ad={ad} />
                
                {/* Remove button - always visible */}
                <button
                  onClick={() => removeSaved(ad._id)}
                  className="absolute top-3 right-3 w-9 h-9 bg-white/95 backdrop-blur-sm text-zinc-600 
                             hover:bg-red-500 hover:text-white rounded-xl shadow-lg border border-zinc-100
                             flex items-center justify-center transition-all duration-200 z-10
                             hover:scale-110"
                  title="Remove from saved"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Modern design */}
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
