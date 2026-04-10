import React, { useEffect, useState } from "react";
import { getAnalytics, AnalyticsData, DailyDataPoint } from "../api/admin";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Flag,
  Activity,
  Calendar,
} from "lucide-react";

// ============ MINI CHART COMPONENTS (Pure CSS, no external deps) ============

function BarChart({
  data,
  color = "#8b5cf6",
  height = 120,
  label,
}: {
  data: DailyDataPoint[];
  color?: string;
  height?: number;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  // Show last 14 days for bar chart readability
  const visible = data.slice(-14);

  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {visible.map((d) => {
          const barH = (d.count / max) * height;
          return (
            <div
              key={d.date}
              className="flex-1 rounded-t-sm relative group cursor-pointer transition-opacity hover:opacity-80"
              style={{ height: barH || 2, backgroundColor: color, minWidth: 6 }}
              title={`${d.date}: ${d.count} ${label}`}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                {d.date.slice(5)}: {d.count}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{visible[0]?.date.slice(5)}</span>
        <span>{visible[visible.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function SparkLine({
  data,
  color = "#8b5cf6",
}: {
  data: DailyDataPoint[];
  color?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const h = 40;
  const w = 200;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.count / max) * h;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DonutChart({
  data,
  colors,
}: {
  data: Record<string, number>;
  colors: Record<string, string>;
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-8">No data</div>
    );
  }

  let currentAngle = 0;

  const segments = Object.entries(data).map(([key, value]) => {
    const percentage = value / total;
    const startAngle = currentAngle;
    const endAngle = currentAngle + percentage * 360;
    currentAngle = endAngle;

    // SVG arc path
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);
    const largeArc = percentage > 0.5 ? 1 : 0;

    const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return (
      <path
        key={key}
        d={path}
        fill={colors[key] || "#94a3b8"}
        className="transition-opacity hover:opacity-80 cursor-pointer"
      >
        <title>
          {key}: {value} ({(percentage * 100).toFixed(1)}%)
        </title>
      </path>
    );
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-28 h-28">
        {segments}
        <circle cx="50" cy="50" r="22" fill="white" />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[10px] font-bold fill-gray-700"
        >
          {total}
        </text>
      </svg>
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[key] || "#94a3b8" }}
            />
            <span className="text-gray-600 capitalize">{key}</span>
            <span className="font-semibold text-gray-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    setError("");
    getAnalytics(days)
      .then(setData)
      .catch((err) => setError(err?.response?.data?.error || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">{error || "No data available"}</p>
        <button
          onClick={() => setDays(30)}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Compute totals for the period
  const totalSignups = data.daily.signups.reduce((a, b) => a + b.count, 0);
  const totalAds = data.daily.ads.reduce((a, b) => a + b.count, 0);
  const totalReports = data.daily.reports.reduce((a, b) => a + b.count, 0);

  // Weekly comparison: this week vs last week
  const last7 = data.daily.signups.slice(-7);
  const prev7 = data.daily.signups.slice(-14, -7);
  const thisWeekSignups = last7.reduce((a, b) => a + b.count, 0);
  const prevWeekSignups = prev7.reduce((a, b) => a + b.count, 0);
  const signupTrend =
    prevWeekSignups > 0
      ? ((thisWeekSignups - prevWeekSignups) / prevWeekSignups) * 100
      : thisWeekSignups > 0
        ? 100
        : 0;

  const statusColors: Record<string, string> = {
    approved: "#22c55e",
    pending: "#f59e0b",
    rejected: "#ef4444",
    hidden: "#6b7280",
    suspended: "#dc2626",
    draft: "#94a3b8",
    active: "#22c55e",
    reviewed: "#3b82f6",
    dismissed: "#9ca3af",
  };

  const tierColors: Record<string, string> = {
    STANDARD: "#94a3b8",
    FEATURED: "#f59e0b",
    PRIORITY_PLUS: "#8b5cf6",
    PRIORITY: "#ec4899",
  };

  const typeColors: Record<string, string> = {
    independent: "#3b82f6",
    agency: "#10b981",
    unknown: "#94a3b8",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
            <p className="text-sm text-gray-500">
              Platform performance over the last {days} days
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                days === d
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Signups card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">
                New Signups
              </span>
            </div>
            {signupTrend !== 0 && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  signupTrend > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {signupTrend > 0 ? "+" : ""}
                {signupTrend.toFixed(0)}% vs last week
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-800">{totalSignups}</p>
          <SparkLine data={data.daily.signups} color="#3b82f6" />
        </div>

        {/* Ads card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-gray-600">
              Ads Posted
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{totalAds}</p>
          <SparkLine data={data.daily.ads} color="#8b5cf6" />
        </div>

        {/* Reports card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Flag className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-gray-600">
              Reports Filed
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{totalReports}</p>
          <SparkLine data={data.daily.reports} color="#f59e0b" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Signups Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-700">Daily Signups</h3>
          </div>
          <BarChart data={data.daily.signups} color="#3b82f6" label="signups" />
        </div>

        {/* Daily Ads Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-700">Daily Ads</h3>
          </div>
          <BarChart data={data.daily.ads} color="#8b5cf6" label="ads" />
        </div>
      </div>

      {/* Breakdowns Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Ads by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Ads by Status
          </h3>
          <DonutChart data={data.breakdowns.adsByStatus} colors={statusColors} />
        </div>

        {/* Ads by Tier */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Ads by Tier
          </h3>
          <DonutChart data={data.breakdowns.adsByTier} colors={tierColors} />
        </div>

        {/* Users by Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Users by Type
          </h3>
          <DonutChart data={data.breakdowns.usersByType} colors={typeColors} />
        </div>
      </div>

      {/* Reports & Admin Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Flag className="w-4 h-4" /> Reports by Status
          </h3>
          <DonutChart
            data={data.breakdowns.reportsByStatus}
            colors={statusColors}
          />
        </div>

        {/* Admin Activity Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Admin Actions ({days}d)
          </h3>
          {Object.keys(data.adminActivity).length === 0 ? (
            <p className="text-gray-400 text-sm py-4">
              No admin actions in this period
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(data.adminActivity)
                .sort(([, a], [, b]) => b - a)
                .map(([action, count]) => {
                  const maxCount = Math.max(
                    ...Object.values(data.adminActivity)
                  );
                  return (
                    <div key={action} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-36 truncate">
                        {action.replace(/_/g, " ")}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4">
                        <div
                          className="bg-purple-500 h-4 rounded-full transition-all"
                          style={{
                            width: `${(count / maxCount) * 100}%`,
                            minWidth: "8px",
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
