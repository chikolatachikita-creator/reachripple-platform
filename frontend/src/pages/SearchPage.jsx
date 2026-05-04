// src/pages/SearchPage.jsx — Keyword search across ALL categories (no escort bias)
import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import api from "../api/client";
import { getAssetUrl } from "../config/api";
import Footer from "../components/Footer";
import ThemeToggle from "../components/ThemeToggle";

const ADULT_CATEGORIES = new Set([
  "escorts", "escort", "trans-escorts", "gay-escorts",
  "adult-entertainment", "adult-dating", "free-personals",
]);

const CATEGORY_ICON = {
  vehicles: "🚗",
  property: "🏠",
  "buy-sell": "🛒",
  jobs: "💼",
  services: "🔧",
  community: "🤝",
  pets: "🐾",
  electronics: "📱",
  furniture: "🛋️",
  fashion: "👗",
  sports: "⚽",
  entertainment: "🎵",
  farming: "🌾",
  escorts: "💎",
  massage: "✨",
  dating: "💝",
};

function getProfileLink(ad) {
  const slug = (ad.categorySlug || "").toLowerCase().trim();
  if (ADULT_CATEGORIES.has(slug)) return `/profile/${ad._id}`;
  return `/listing/${ad._id}`;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const initialQ = params.get("q") || params.get("query") || "";

  const [q, setQ] = useState(initialQ);
  const [includeAdult, setIncludeAdult] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync URL q param into state when navigating
  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    if (!initialQ.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get("/ads", { params: { search: initialQ.trim(), limit: 60 } })
      .then((res) => setResults(res.data.ads || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [initialQ]);

  const filtered = includeAdult
    ? results
    : results.filter(
        (a) => !ADULT_CATEGORIES.has((a.categorySlug || "").toLowerCase().trim())
      );

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <Helmet>
        <title>{initialQ ? `Search: ${initialQ}` : "Search"} | ReachRipple</title>
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </Link>
          <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search all listings..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-pink-500 outline-none text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg transition-shadow"
            >
              Search
            </button>
          </form>
          <ThemeToggle />
        </div>
      </header>

      {/* Results */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            {initialQ ? (
              <>
                {filtered.length} result{filtered.length === 1 ? "" : "s"} for{" "}
                <span className="text-pink-600">"{initialQ}"</span>
              </>
            ) : (
              "Search Listings"
            )}
          </h1>
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAdult}
              onChange={(e) => setIncludeAdult(e.target.checked)}
              className="w-4 h-4 accent-pink-500"
            />
            Include adult listings
          </label>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-zinc-200 dark:bg-zinc-800 aspect-[4/5] animate-pulse"
              />
            ))}
          </div>
        ) : !initialQ ? (
          <div className="text-center py-16 text-zinc-500 dark:text-zinc-400">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Type something above to search across all categories.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 dark:text-zinc-400">
            <p className="mb-3">
              No listings found for{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{initialQ}"</span>.
            </p>
            <p className="text-sm">Try different keywords or browse categories from the homepage.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((ad) => {
              const img = ad.images?.[0];
              const slug = (ad.categorySlug || "").toLowerCase().trim();
              const icon = CATEGORY_ICON[slug] || "📦";
              return (
                <Link
                  key={ad._id}
                  to={getProfileLink(ad)}
                  className="group rounded-2xl overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img
                        src={getAssetUrl(img)}
                        alt={ad.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-5xl opacity-50">{icon}</span>
                    )}
                    <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                      {ad.category}
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white line-clamp-2 mb-1">
                      {ad.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 truncate">{ad.location}</span>
                      {ad.price > 0 && (
                        <span className="font-bold text-pink-600 dark:text-pink-400 ml-2 whitespace-nowrap">
                          £{ad.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
