import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Eye,
  Star,
  Zap,
  Shield,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/**
 * GrowthDashboardPage — Advertiser insights dashboard.
 * Shows visibility scores, engagement metrics, improvement suggestions,
 * tier info, and per-ad breakdowns.
 */

// Score ring component
function ScoreRing({ label, value, max = 100, color, icon: Icon }) {
  const pct = Math.min((value / max) * 100, 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-5 h-5 mb-0.5" style={{ color }} />
          <span className="text-xl font-bold text-gray-800">{Math.round(value)}</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-600">{label}</span>
    </div>
  );
}

// Metric card component
function MetricCard({ label, value, change, icon: Icon }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 text-gray-400" />
        {change !== undefined && (
          <span className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-500"}`}>
            {isPositive ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// Suggestion row
function Suggestion({ text, priority }) {
  const colors = {
    high: "border-red-200 bg-red-50 text-red-800",
    medium: "border-amber-200 bg-amber-50 text-amber-800",
    low: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[priority] || colors.low}`}>
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

export default function GrowthDashboardPage() {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/ads/my")
      .then((res) => setAds(res.data.ads || res.data || []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, []);

  // Aggregate metrics across all user's ads
  const totalViews = ads.reduce((s, a) => s + (a.views || 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);
  const avgVisibility = ads.length
    ? Math.round(ads.reduce((s, a) => s + (a.visibilityScore || 0), 0) / ads.length)
    : 0;
  const avgEngagement = ads.length
    ? Math.round(ads.reduce((s, a) => s + (a.engagementScore || 0), 0) / ads.length)
    : 0;
  const avgQuality = ads.length
    ? Math.round(ads.reduce((s, a) => s + (a.qualityScore || 0), 0) / ads.length)
    : 0;

  // Generate improvement suggestions based on ad data
  function getSuggestions() {
    const suggestions = [];

    for (const ad of ads) {
      if ((ad.images || []).length < 3) {
        suggestions.push({ text: `"${ad.title}" — Add more photos (${(ad.images || []).length}/5+ recommended)`, priority: "high" });
      }
      if ((ad.description || "").length < 150) {
        suggestions.push({ text: `"${ad.title}" — Write a longer description for better quality score`, priority: "medium" });
      }
      if (!ad.pricing || Object.keys(ad.pricing).length === 0) {
        suggestions.push({ text: `"${ad.title}" — Add pricing tiers to appear more professional`, priority: "medium" });
      }
      if (!ad.profileFields?.location) {
        suggestions.push({ text: `"${ad.title}" — Set a service location in your profile fields`, priority: "low" });
      }
    }

    if (user && !user.isVerified) {
      suggestions.push({ text: "Verify your email to improve your trust score", priority: "high" });
    }
    if (user?.idVerificationStatus !== "verified") {
      suggestions.push({ text: "Complete ID verification for a significant trust boost (+3 Trust)", priority: "high" });
    }
    if (user?.accountTier === "free") {
      suggestions.push({ text: "Upgrade your tier for better visibility multipliers", priority: "low" });
    }

    return suggestions.slice(0, 6);
  }

  const suggestions = getSuggestions();
  const accountTier = user?.accountTier || "free";
  const tierLabels = { free: "Free", standard: "Standard", prime: "Prime", spotlight: "Spotlight" };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="w-8 h-8" />
                Growth Dashboard
              </h1>
              <p className="text-gray-300 mt-2">
                Track your visibility, engagement, and discover ways to grow
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-400">Account Tier</span>
              <p className="text-lg font-semibold capitalize">{tierLabels[accountTier]}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Score Rings */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Your Scores</h2>
          <div className="flex justify-center gap-12 flex-wrap">
            <ScoreRing label="Quality" value={avgQuality} color="#8b5cf6" icon={Star} />
            <ScoreRing label="Visibility" value={avgVisibility} max={2000} color="#ec4899" icon={Eye} />
            <ScoreRing label="Engagement" value={avgEngagement} max={150} color="#f59e0b" icon={Zap} />
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Total Views" value={totalViews} icon={Eye} />
          <MetricCard label="Total Clicks" value={totalClicks} icon={TrendingUp} />
          <MetricCard label="Active Ads" value={ads.filter((a) => a.status === "approved").length} icon={CheckCircle2} />
          <MetricCard label="Avg. Visibility" value={avgVisibility} icon={ArrowUpRight} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Improvement Suggestions */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ChevronUp className="w-5 h-5 text-green-500" />
              Ways to Improve
            </h2>
            {suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <Suggestion key={i} text={s.text} priority={s.priority} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                <p>Looking great! No suggestions right now.</p>
              </div>
            )}
          </div>

          {/* Verification & Tier */}
          <div className="space-y-6">
            {/* Verification Status */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Verification
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Email</span>
                  <span className={`text-sm font-medium ${user?.isVerified ? "text-green-600" : "text-amber-500"}`}>
                    {user?.isVerified ? "✓ Verified" : "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ID Verification</span>
                  <span
                    className={`text-sm font-medium ${
                      user?.idVerificationStatus === "verified"
                        ? "text-green-600"
                        : user?.idVerificationStatus === "pending"
                        ? "text-amber-500"
                        : "text-gray-400"
                    }`}
                  >
                    {user?.idVerificationStatus === "verified"
                      ? "✓ Verified"
                      : user?.idVerificationStatus === "pending"
                      ? "Under Review"
                      : "Not Verified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tier Upgrade CTA */}
            {accountTier !== "spotlight" && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-sm p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Upgrade Your Tier</h3>
                <p className="text-sm opacity-90 mb-4">
                  Get higher visibility multipliers, more ad slots, and faster bump cooldowns.
                </p>
                <Link
                  to="/pricing"
                  className="inline-block bg-white text-blue-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  View Plans →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Per-Ad Breakdown */}
        {ads.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Ad Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-sm text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Tier</th>
                    <th className="pb-3 font-medium text-right">Views</th>
                    <th className="pb-3 font-medium text-right">Clicks</th>
                    <th className="pb-3 font-medium text-right">Quality</th>
                    <th className="pb-3 font-medium text-right">Visibility</th>
                    <th className="pb-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad) => (
                    <tr key={ad._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3">
                        <Link to={`/ad/${ad._id}`} className="text-blue-600 hover:underline font-medium truncate max-w-[200px] block">
                          {ad.title}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            ad.tier === "FEATURED"
                              ? "bg-yellow-100 text-yellow-700"
                              : ad.tier === "PRIORITY_PLUS"
                              ? "bg-blue-100 text-blue-700"
                              : ad.tier === "PRIORITY"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {ad.tier}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-600">{(ad.views || 0).toLocaleString()}</td>
                      <td className="py-3 text-right text-gray-600">{(ad.clicks || 0).toLocaleString()}</td>
                      <td className="py-3 text-right text-gray-600">{ad.qualityScore || 0}</td>
                      <td className="py-3 text-right font-medium text-gray-800">{ad.visibilityScore || 0}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            ad.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : ad.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {ad.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
