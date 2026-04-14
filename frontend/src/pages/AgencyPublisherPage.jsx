// src/pages/AgencyPublisherPage.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import SearchResultCard from "../components/search/SearchResultCard";
import ThemeToggle from "../components/ThemeToggle";

export default function AgencyPublisherPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  useEffect(() => {
    const fetchPublisherAds = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/ads/publisher/${userId}`);
        setAds(res.data.ads || []);
      } catch (err) {
        setError("Failed to load publisher ads");
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchPublisherAds();
  }, [userId]);

  // Derive agency info from first ad if available
  const firstAd = ads[0];
  const agencyName =
    firstAd?.profileFields?.agencyName ||
    firstAd?.title?.split(" - ")[0] ||
    "Agency";

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-all duration-500 ${
        fadeIn ? "opacity-100" : "opacity-0 translate-y-2"
      }`}
    >
      <Helmet>
        <title>{agencyName} — All Listings | ReachRipple</title>
      </Helmet>

      {/* Navbar */}
      <nav className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50 border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow" />
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight">
                <span className="text-pink-500">Reach</span>
                <span className="text-purple-600">Ripple</span>
              </div>
            </div>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
            <span className="text-2xl">🏢</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
              {agencyName}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 text-xs font-semibold">
                🏢 Agency
              </span>
              <span>
                {ads.length} listing{ads.length !== 1 ? "s" : ""}
              </span>
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-8">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-zinc-100 overflow-hidden animate-pulse"
              >
                <div className="aspect-[3/4] bg-zinc-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-zinc-200 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800/60 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-12 text-center border border-zinc-100 dark:border-zinc-700">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📭</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-white mb-2">
              No Active Listings
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              This publisher doesn't have any active listings at the moment.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
            >
              Browse All Listings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {ads.map((ad, index) => (
              <SearchResultCard key={ad._id} profile={ad} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logomark.png" alt="ReachRipple" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-sm font-medium text-zinc-600">
                © 2026{" "}
                <span className="text-pink-500">Reach</span>
                <span className="text-purple-600">Ripple</span>
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                to="/privacy"
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/help"
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Help
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
