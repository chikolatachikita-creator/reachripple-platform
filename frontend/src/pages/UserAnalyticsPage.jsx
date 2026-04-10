import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../api/client";
import { useToastContext } from "../context/ToastContextGlobal";
import { API_HOST } from "../config/api";

const getImageUrl = (p) => {
  if (!p) return null;
  if (p.startsWith("http")) return p;
  return `${API_HOST}${p}`;
};

// ─── Stat Card ────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent }) => (
  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${accent || "text-zinc-900"}`}>
      {value ?? "—"}
    </p>
    {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
  </div>
);

// ─── Mini bar chart (pure CSS) ────────────────────────────
const DailyChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-zinc-400 italic">No view data yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="flex items-end gap-[3px] h-40 mt-2">
      {data.map((d) => {
        const pct = (d.views / max) * 100;
        return (
          <div
            key={d.date}
            className="group relative flex-1 min-w-[6px]"
          >
            <div
              className="w-full rounded-t bg-gradient-to-t from-pink-500 to-purple-500 transition-all duration-300 hover:opacity-80"
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-zinc-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
              {d.date}: {d.views}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────
export default function UserAnalyticsPage() {
  const navigate = useNavigate();
  const { showError } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get("/analytics/dashboard");
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 401) return navigate("/login");
        showError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [navigate, showError]);

  // ─── Loading skeleton ──────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white pt-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-zinc-100 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-52 bg-zinc-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { totalViews, views30d, views7d, dailyViews, topAds, topReferrers, activeAds, totalAds } = data;

  return (
    <>
      <Helmet>
        <title>My Analytics | Reach Ripple</title>
      </Helmet>

      <div
        className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white pt-24 pb-16 px-4 transition-all duration-500 ${
          fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <h1 className="text-2xl font-bold text-zinc-900 mb-6">My Analytics</h1>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Views" value={totalViews?.toLocaleString()} />
            <StatCard label="Last 30 Days" value={views30d?.toLocaleString()} accent="text-pink-600" />
            <StatCard label="Last 7 Days" value={views7d?.toLocaleString()} accent="text-purple-600" />
            <StatCard
              label="Active Ads"
              value={activeAds}
              sub={`${totalAds} total`}
            />
          </div>

          {/* Daily Views Chart */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100 mb-8">
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">
              Daily Views{" "}
              <span className="text-zinc-400 font-normal">(last 30 days)</span>
            </h2>
            <DailyChart data={dailyViews} />
          </div>

          {/* Two-Column Bottom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Ads */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-700 mb-4">Top Performing Ads</h2>
              {topAds?.length > 0 ? (
                <ul className="space-y-3">
                  {topAds.map((ad, i) => (
                    <li key={ad._id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-400 w-5">{i + 1}</span>
                      {ad.image ? (
                        <img
                          src={getImageUrl(ad.image)}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 truncate">{ad.title}</p>
                      </div>
                      <span className="text-sm font-semibold text-pink-600">{ad.views}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400 italic">No views yet.</p>
              )}
            </div>

            {/* Top Referrers */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-700 mb-4">Top Referrers</h2>
              {topReferrers?.length > 0 ? (
                <ul className="space-y-3">
                  {topReferrers.map((r, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-400 w-5">{i + 1}</span>
                      <p className="text-sm text-zinc-700 truncate flex-1">{r.source}</p>
                      <span className="text-sm font-semibold text-purple-600">{r.views}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400 italic">No referrer data yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
