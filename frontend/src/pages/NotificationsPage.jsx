import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import notificationsAPI from "../api/notifications";
import { useToastContext } from "../context/ToastContextGlobal";

const typeMeta = {
  message: { icon: "💬", label: "Messages" },
  review: { icon: "⭐", label: "Reviews" },
  booking: { icon: "📅", label: "Bookings" },
  boost: { icon: "🚀", label: "Boosts" },
  view: { icon: "👁️", label: "Views" },
  like: { icon: "❤️", label: "Likes" },
  system: { icon: "🔔", label: "System" },
};

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NotificationsPage() {
  const { showToast } = useToastContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    if (activeFilter === "unread") return notifications.filter((item) => !item.read);
    return notifications;
  }, [notifications, activeFilter]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationsAPI.getMy();
      setNotifications(response.data?.notifications || []);
    } catch (error) {
      showToast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) => prev.map((item) => (
        item._id === id ? { ...item, read: true } : item
      )));
    } catch (error) {
      showToast("Could not mark notification as read", "error");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      showToast("All notifications marked as read", "success");
    } catch (error) {
      showToast("Could not mark all notifications as read", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Helmet>
        <title>Notifications | ReachRipple</title>
      </Helmet>

      <Navbar showSaved={false} />

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <section className="rounded-3xl border border-slate-200/80 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="px-5 sm:px-8 py-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 sm:gap-0 sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Notifications</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Stay on top of profile activity, updates, and important account events.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-3 py-1 text-xs font-bold">
                {unreadCount} unread
              </span>
              <button
                onClick={handleMarkAllAsRead}
                disabled={notifications.length === 0 || unreadCount === 0}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Mark all read
              </button>
            </div>
          </div>

          <div className="px-5 sm:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter("unread")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeFilter === "unread" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              Unread
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading notifications...</div>
            ) : visibleNotifications.length === 0 ? (
              <div className="p-12 sm:p-16 text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 animate-pulse" />
                  <div className="relative w-full h-full flex items-center justify-center">
                    <span className="text-5xl animate-[wiggle_1.5s_ease-in-out_infinite]" style={{ display: 'inline-block', transformOrigin: 'top center' }}>🔔</span>
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">You're all caught up!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  No new notifications right now. We'll let you know when something interesting happens — saves, messages, or status updates on your ads.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-700 text-white text-sm font-bold shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Back to Dashboard
                  </Link>
                  <Link
                    to="/create-ad"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                  >
                    + Post a new ad
                  </Link>
                </div>
                <style>{`@keyframes wiggle { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }`}</style>
              </div>
            ) : (
              visibleNotifications.map((item) => {
                const meta = typeMeta[item.type] || { icon: "🔔", label: "Notification" };
                return (
                  <article
                    key={item._id}
                    className={`px-5 sm:px-8 py-4 sm:py-5 flex items-start gap-4 ${item.read ? "bg-transparent" : "bg-blue-50/60 dark:bg-blue-900/20"}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg flex-shrink-0">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{meta.label}</span>
                        {!item.read && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            New
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(item.createdAt)}</span>
                      </div>
                      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300">{item.message}</p>
                    </div>
                    {!item.read && (
                      <button
                        onClick={() => handleMarkAsRead(item._id)}
                        className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        Mark read
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
