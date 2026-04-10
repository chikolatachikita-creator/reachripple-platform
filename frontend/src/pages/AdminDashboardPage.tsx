import React, { useEffect, useState } from "react";
import { getAdminStats, AdminStats } from "../api/admin";
import { Link } from "react-router-dom";
import { ErrorAlert } from "../components/Alerts";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getAdminStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "Failed to load stats. Please try again.";
      setError(errorMessage);
      console.error("Admin stats error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-100 rounded-xl" />
                <div className="w-16 h-6 bg-gray-100 rounded-full" />
              </div>
              <div className="w-20 h-8 bg-gray-200 rounded mb-2" />
              <div className="w-28 h-4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        {/* Quick actions skeleton */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
          <div className="w-32 h-6 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Ads",
      value: stats?.ads.total || 0,
      subtitle: `${stats?.ads.approved || 0} approved`,
      color: "from-purple-500 to-purple-600",
      icon: "📋",
      link: "/admin/ads",
    },
    {
      title: "Pending Ads",
      value: stats?.ads.pending || 0,
      subtitle: "Awaiting review",
      color: "from-yellow-500 to-orange-500",
      icon: "⏳",
      link: "/admin/ads?status=pending",
    },
    {
      title: "Total Users",
      value: stats?.users.total || 0,
      subtitle: `${stats?.users.active || 0} active`,
      color: "from-blue-500 to-cyan-500",
      icon: "👥",
      link: "/admin/users",
    },
    {
      title: "Reports",
      value: stats?.reports.pending || 0,
      subtitle: `${stats?.reports.total || 0} total`,
      color: "from-red-500 to-pink-500",
      icon: "🚩",
      link: "/admin/reports",
    },
    {
      title: "Today's Signups",
      value: stats?.today?.signups || 0,
      subtitle: "New users today",
      color: "from-green-500 to-emerald-500",
      icon: "🆕",
      link: "/admin/users",
    },
    {
      title: "Today's Ads",
      value: stats?.today?.ads || 0,
      subtitle: "Posted today",
      color: "from-indigo-500 to-violet-500",
      icon: "📝",
      link: "/admin/ads",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your platform overview.</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <span>{loading ? "⟳" : "🔄"}</span>
          Refresh
        </button>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">{card.subtitle}</p>
              </div>
              <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl shadow-md`}>
                {card.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-md rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/admin/ads?status=pending"
            className="p-4 bg-yellow-50 text-yellow-700 rounded-lg text-center hover:bg-yellow-100 transition-colors"
          >
            <div className="text-2xl mb-1">📋</div>
            <div className="font-medium">Review Ads</div>
            <div className="text-sm opacity-75">{stats?.ads.pending || 0} pending</div>
          </Link>
          <Link
            to="/admin/reports"
            className="p-4 bg-red-50 text-red-700 rounded-lg text-center hover:bg-red-100 transition-colors"
          >
            <div className="text-2xl mb-1">🚨</div>
            <div className="font-medium">Handle Reports</div>
            <div className="text-sm opacity-75">{stats?.reports.pending || 0} pending</div>
          </Link>
          <Link
            to="/admin/users"
            className="p-4 bg-blue-50 text-blue-700 rounded-lg text-center hover:bg-blue-100 transition-colors"
          >
            <div className="text-2xl mb-1">👥</div>
            <div className="font-medium">Manage Users</div>
            <div className="text-sm opacity-75">{stats?.users.total || 0} total</div>
          </Link>
          <Link
            to="/admin/settings"
            className="p-4 bg-gray-50 text-gray-700 rounded-lg text-center hover:bg-gray-100 transition-colors"
          >
            <div className="text-2xl mb-1">⚙️</div>
            <div className="font-medium">Settings</div>
            <div className="text-sm opacity-75">Configure site</div>
          </Link>
        </div>
      </div>

      {/* Recent Admin Activity */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div className="bg-white shadow-md rounded-xl p-6 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Admin Activity</h2>
          <div className="space-y-3">
            {stats.recentActivity.map((log) => (
              <div key={log._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">
                  {log.action.includes("AD_") ? "📋" : log.action.includes("USER_") ? "👤" : log.action.includes("REPORT_") ? "🚩" : "⚙️"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{log.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {log.adminEmail} · {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">
                  {log.action.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
