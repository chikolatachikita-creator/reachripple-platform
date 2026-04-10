import React, { useEffect, useState } from "react";
import {
  getRevenueOverview,
  getRevenueTrends,
  getRevenueByLocation,
  getRevenueInventory,
  getRevenueExpiring,
  RevenueOverview,
  RevenueTrend,
  LocationRevenue,
  InventoryLocation,
} from "../api/admin";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  MapPin,
  Package,
  Clock,
  BarChart3,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// ============ STAT CARD ============
function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  change?: string | number;
  icon: React.ElementType;
  color: string;
}) {
  const isPositive = Number(change) >= 0;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-sm ${isPositive ? "text-green-600" : "text-red-500"}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isPositive ? "+" : ""}{change}%</span>
            <span className="text-gray-400 ml-1">vs prev</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ BAR CHART (CSS-only) ============
function RevenueBarChart({ data, height = 180 }: { data: RevenueTrend[]; height?: number }) {
  if (!data.length) return <p className="text-gray-400 text-center py-8">No trend data available</p>;
  const max = Math.max(...data.map((d) => d.totalRevenue), 1);

  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d) => {
          const barH = (d.totalRevenue / max) * height;
          return (
            <div
              key={d.period}
              className="flex-1 rounded-t relative group cursor-pointer bg-purple-500 hover:bg-purple-600 transition-colors"
              style={{ height: Math.max(barH, 2), minWidth: 8 }}
              title={`${d.period}: £${d.totalRevenue.toFixed(2)} (${d.totalCount} txns)`}
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                {d.period}: £{d.totalRevenue.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{data[0]?.period}</span>
        <span>{data[data.length - 1]?.period}</span>
      </div>
    </div>
  );
}

// ============ DONUT CHART (SVG) ============
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  const RADIUS = 40;
  const CIRC = 2 * Math.PI * RADIUS;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-28 h-28">
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = pct * CIRC;
          const gap = CIRC - dash;
          const currentOffset = offset;
          offset += pct * 100;
          return (
            <circle
              key={seg.label}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={(-currentOffset / 100) * CIRC}
              transform="rotate(-90 50 50)"
            />
          );
        })}
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600">{seg.label}</span>
            <span className="font-medium text-gray-900 ml-auto">£{seg.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ COLORS ============
const PRODUCT_COLORS: Record<string, string> = {
  FEATURED: "#f59e0b",
  PRIORITY_PLUS: "#8b5cf6",
  PRIORITY: "#ec4899",
  STANDARD: "#6b7280",
  default: "#6b7280",
};

// ============ MAIN PAGE ============
export default function AdminRevenuePage() {
  const [period, setPeriod] = useState("30d");
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [trends, setTrends] = useState<RevenueTrend[]>([]);
  const [locations, setLocations] = useState<LocationRevenue[]>([]);
  const [inventory, setInventory] = useState<InventoryLocation[]>([]);
  const [expiring, setExpiring] = useState<{ count: number; ads: any[] }>({ count: 0, ads: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [ov, tr, loc, inv, exp] = await Promise.all([
        getRevenueOverview(period),
        getRevenueTrends(period, "day"),
        getRevenueByLocation(period),
        getRevenueInventory(),
        getRevenueExpiring(48),
      ]);
      setOverview(ov);
      setTrends(tr.trends);
      setLocations(loc.locations);
      setInventory(inv.locations);
      setExpiring(exp);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={fetchAll} className="mt-3 text-sm text-red-500 underline">Retry</button>
        </div>
      </div>
    );
  }

  const cur = overview?.current || { totalRevenue: 0, totalTransactions: 0, uniqueUsers: 0, uniqueAds: 0 };
  const pctChange = overview?.percentChange || { revenue: 0, transactions: 0 };

  const productSegments = (overview?.productBreakdown || []).map((p) => ({
    label: p.product,
    value: p.revenue,
    color: PRODUCT_COLORS[p.product] || PRODUCT_COLORS.default,
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Boost purchase revenue & inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={fetchAll}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={`£${cur.totalRevenue.toFixed(2)}`}
          change={pctChange.revenue}
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatCard
          label="Transactions"
          value={cur.totalTransactions.toLocaleString()}
          change={pctChange.transactions}
          icon={BarChart3}
          color="bg-purple-500"
        />
        <StatCard
          label="Unique Buyers"
          value={cur.uniqueUsers.toLocaleString()}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          label="Boosted Ads"
          value={cur.uniqueAds.toLocaleString()}
          icon={Package}
          color="bg-amber-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <RevenueBarChart data={trends} />
        </div>

        {/* Product Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Breakdown</h2>
          {productSegments.length ? (
            <DonutChart segments={productSegments} />
          ) : (
            <p className="text-gray-400 text-center py-8">No product data</p>
          )}
        </div>
      </div>

      {/* Location Revenue + Inventory Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Locations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Revenue by Location</h2>
          </div>
          {locations.length ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {locations.slice(0, 15).map((loc, i) => {
                const maxRev = locations[0]?.revenue || 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate">{loc.location || "Unknown"}</span>
                        <span className="text-sm font-semibold text-gray-900">£{loc.revenue.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(loc.revenue / maxRev) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No location data</p>
          )}
        </div>

        {/* Inventory Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Tier Inventory</h2>
          </div>
          {inventory.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium text-center">Featured</th>
                    <th className="pb-2 font-medium text-center">Priority Plus</th>
                    <th className="pb-2 font-medium text-center">Fill</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.slice(0, 15).map((loc, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700 truncate max-w-[150px]">{loc.location}</td>
                      <td className="py-2 text-center">
                        <span className="text-amber-600 font-medium">{loc.featured}</span>
                        <span className="text-gray-400">/{loc.featuredCap}</span>
                      </td>
                      <td className="py-2 text-center">
                        <span className="text-purple-600 font-medium">{loc.priorityPlus}</span>
                        <span className="text-gray-400">/{loc.priorityPlusCap}</span>
                      </td>
                      <td className="py-2 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          parseFloat(loc.featuredFillRate) > 80
                            ? "bg-red-100 text-red-600"
                            : parseFloat(loc.featuredFillRate) > 50
                            ? "bg-amber-100 text-amber-600"
                            : "bg-green-100 text-green-600"
                        }`}>
                          {loc.featuredFillRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No inventory data</p>
          )}
        </div>
      </div>

      {/* Expiring Tiers */}
      {expiring.count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-amber-900">
              Expiring Soon ({expiring.count} tiers within 48h)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-amber-700 border-b border-amber-200">
                  <th className="pb-2 font-medium">Ad</th>
                  <th className="pb-2 font-medium">Tier</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium text-right">Hours Left</th>
                </tr>
              </thead>
              <tbody>
                {expiring.ads.slice(0, 10).map((ad: any, i: number) => (
                  <tr key={i} className="border-b border-amber-100">
                    <td className="py-2 text-gray-700 truncate max-w-[200px]">{ad.title}</td>
                    <td className="py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ad.tier === "FEATURED" ? "bg-amber-100 text-amber-700" :
                        ad.tier === "PRIORITY_PLUS" ? "bg-purple-100 text-purple-700" :
                        "bg-pink-100 text-pink-700"
                      }`}>
                        {ad.tier}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600">{ad.location}</td>
                    <td className="py-2 text-gray-600">{ad.user}</td>
                    <td className="py-2 text-right font-medium text-amber-700">{ad.hoursRemaining}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Purchases */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Purchases</h2>
        {overview?.recentPurchases?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Ad</th>
                  <th className="pb-2 font-medium text-right">Price</th>
                  <th className="pb-2 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentPurchases.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.product === "FEATURED" ? "bg-amber-100 text-amber-700" :
                        p.product === "PRIORITY_PLUS" ? "bg-purple-100 text-purple-700" :
                        "bg-pink-100 text-pink-700"
                      }`}>
                        {p.product}
                      </span>
                    </td>
                    <td className="py-2 text-gray-700">{p.user}</td>
                    <td className="py-2 text-gray-600 truncate max-w-[200px]">{p.adTitle}</td>
                    <td className="py-2 text-right font-medium text-gray-900">£{p.price?.toFixed(2) || "—"}</td>
                    <td className="py-2 text-right text-gray-500">
                      {p.date ? new Date(p.date).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No recent purchases</p>
        )}
      </div>
    </div>
  );
}
