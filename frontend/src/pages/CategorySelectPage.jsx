// src/pages/CategorySelectPage.jsx - Category selection before ad creation
import React from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PLATFORM_CATEGORIES } from "../config/categories";

const CATEGORY_ICONS = {
  escorts: "💎",
  massage: "✨",
  dating: "💝",
  jobs: "💼",
  entertainment: "🎵",
  alternative: "🌿",
  "buy-sell": "🛒",
  vehicles: "🚗",
  property: "🏠",
  pets: "🐾",
  community: "🤝",
  services: "🔧",
  domestic: "🧹",
  classes: "📚",
  holidays: "✈️",
  farming: "🌾",
};

export default function CategorySelectPage() {
  const navigate = useNavigate();

  const handleSelect = (slug) => {
    if (slug === "escorts") {
      navigate("/create-ad/escort-form");
    } else {
      navigate(`/create-ad/${slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <Helmet>
        <title>Post an Ad – Choose Category | ReachRipple</title>
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/40 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Post an Ad</h1>
            <p className="text-sm text-white/60">
              Choose a category to get started
            </p>
          </div>
        </div>
      </header>

      {/* Category Grid */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => handleSelect(cat.slug)}
              className={`group relative p-6 rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl hover:border-white/40 hover:from-white/20 hover:to-white/10 active:scale-[0.98] transition-all text-left cursor-pointer`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">
                  {CATEGORY_ICONS[cat.slug] || "📁"}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white group-hover:text-white/90 mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-white/50 line-clamp-2">
                    {cat.description}
                  </p>
                  {cat.monetized ? (
                    <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                      Premium
                    </span>
                  ) : (
                    <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">
                      FREE
                    </span>
                  )}
                </div>
                <span className="text-white/30 group-hover:text-white/60 transition-colors text-xl">
                  →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
