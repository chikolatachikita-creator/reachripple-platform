import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import StatusPill from "../components/ui/StatusPill";
import SkeletonTable from "../components/ui/SkeletonTable";
import { useToastContext } from "../context/ToastContextGlobal";
import { useAuth } from "../context/AuthContext";
import UpsellBanner from "../components/dashboard/UpsellBanner";
import ThemeToggle from "../components/ThemeToggle";

const PLAN_LABELS = { free: "Free", basic: "Basic", premium: "Premium" };

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const { showError } = useToastContext();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [ads, setAds] = useState([]);
  const [postingLimits, setPostingLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user profile
        const userRes = await api.get("/auth/me");
        setUser(userRes.data.user || userRes.data);

        // Get user's ads
        const adsRes = await api.get("/ads/my");
        setAds(adsRes.data.ads || []);

        // Get posting limits
        try {
          const limitsRes = await api.get("/ads/posting-limits");
          setPostingLimits(limitsRes.data);
        } catch { /* non-critical */ }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login");
          return;
        }
        showError("Failed to load dashboard data");
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate, showError]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
        <nav className="w-full bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-zinc-100">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600"></div>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="animate-pulse">
            <div className="h-10 w-64 bg-zinc-200 rounded-xl mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <div className="h-4 w-20 bg-zinc-200 rounded mb-3"></div>
                  <div className="h-8 w-16 bg-zinc-200 rounded"></div>
                </div>
              ))}
            </div>
            <SkeletonTable rows={4} cols={6} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-all duration-500 ${fadeIn ? "opacity-100" : "opacity-0 translate-y-2"}`}>
      <Helmet><title>Dashboard | ReachRipple</title></Helmet>
      {/* Modern Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow" />
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight"><span className="text-pink-500">Reach</span><span className="text-purple-600">Ripple</span></div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">Dashboard</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link 
              to="/account" 
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account
            </Link>
            <Link 
              to="/create-ad" 
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                         bg-gradient-to-r from-pink-500 to-purple-600 text-white 
                         shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 
                         hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Ad
            </Link>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-pink-500/25">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                Welcome back, {user?.name?.split(' ')[0] || "User"}! 👋
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">{user?.email}</p>
            </div>
          </div>
          <Link
            to="/my-ads"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                       border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600
                       active:scale-[0.98] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Manage All Ads
          </Link>
        </div>

        {/* Account Type & Posting Limits Banner */}
        {user && (
          <div className={`mb-6 rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            user.accountType === 'agency'
              ? 'bg-sky-50 border-sky-200'
              : 'bg-pink-50 border-pink-200'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                user.accountType === 'agency'
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-pink-100 text-pink-700'
              }`}>
                {user.accountType === 'agency' ? '🏢 Agency' : '👤 Independent'}
              </span>
              <span className="text-sm text-zinc-600">
                {PLAN_LABELS[user.postingPlan || 'free']} Plan
              </span>
              {user.idVerificationStatus === 'verified' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  ✓ ID Verified
                </span>
              ) : user.idVerificationStatus === 'pending' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  ⏳ Verification Pending
                </span>
              ) : (
                <Link
                  to="/verification"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold hover:bg-orange-200 transition-colors"
                >
                  🛡️ Verify ID
                </Link>
              )}
            </div>
            {postingLimits && (
              <div className="flex items-center gap-3">
                <div className="text-sm text-zinc-600">
                  <span className="font-bold text-zinc-900">{postingLimits.currentCount}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="font-semibold">{postingLimits.maxAllowed}</span>
                  <span className="text-zinc-500"> ads used</span>
                </div>
                <div className="w-24 h-2 rounded-full bg-white overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      postingLimits.currentCount >= postingLimits.maxAllowed ? 'bg-red-500' : 'bg-gradient-to-r from-pink-500 to-purple-500'
                    }`}
                    style={{ width: `${Math.min(100, (postingLimits.currentCount / postingLimits.maxAllowed) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-8 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button
              onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
              className="ml-auto px-3 py-1 text-sm font-medium rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-800/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border border-zinc-100 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-50 dark:from-purple-900/40 dark:to-pink-900/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Total Ads</p>
            </div>
            <p className="text-3xl font-black text-zinc-900 dark:text-white">{ads.length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-800/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border border-zinc-100 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Approved</p>
            </div>
            <p className="text-3xl font-black text-green-600">{ads.filter((a) => a.status === "approved").length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-800/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border border-zinc-100 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Pending</p>
            </div>
            <p className="text-3xl font-black text-amber-600">{ads.filter((a) => a.status === "pending").length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-800/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border border-zinc-100 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-rose-50 dark:from-red-900/40 dark:to-rose-900/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Rejected</p>
            </div>
            <p className="text-3xl font-black text-red-500">{ads.filter((a) => a.status === "rejected").length}</p>
          </div>
        </div>

        {/* Boost Upsell Banner - Show for approved ads without premium tier */}
        {ads.filter(a => a.status === "approved" && (!a.tier || a.tier === "STANDARD")).length > 0 && (
          <div className="mb-8">
            <UpsellBanner 
              ad={ads.find(a => a.status === "approved" && (!a.tier || a.tier === "STANDARD"))}
              variant="full"
              className="animate-fade-in"
            />
          </div>
        )}

        {/* My Ads Section */}
        <div className="bg-white dark:bg-zinc-800/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100 dark:border-zinc-700 overflow-hidden">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-700 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800 dark:to-zinc-800/60">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Ads</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Your latest listings</p>
            </div>
            <Link
              to="/create-ad"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                         bg-gradient-to-r from-pink-500 to-purple-600 text-white 
                         shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 
                         hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Create New Ad
            </Link>
          </div>
          
          {ads.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📢</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-2">No Ads Yet</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                You haven't posted any ads yet. Create your first listing to get started!
              </p>
              <Link 
                to="/create-ad" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm
                           bg-gradient-to-r from-pink-500 to-purple-600 text-white 
                           shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 
                           hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Post Your First Ad
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Title</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">Location</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Price</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {ads.slice(0, 5).map((ad) => (
                    <tr key={ad._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <Link to={`/profile/${ad._id}`} className="text-zinc-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 font-semibold transition-colors line-clamp-1">
                          {ad.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 text-sm hidden sm:table-cell">{ad.category}</td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 text-sm hidden md:table-cell">{ad.location}</td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-zinc-900 dark:text-white">£{ad.price}</span>
                      </td>
                      <td className="px-5 py-4"><StatusPill status={ad.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/edit-ad/${ad._id}`} 
                            className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <Link 
                            to={`/profile/${ad._id}`} 
                            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                            title="View"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ads.length > 5 && (
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-center">
                  <Link 
                    to="/my-ads" 
                    className="text-sm font-semibold text-pink-600 hover:text-pink-700 transition-colors"
                  >
                    View all {ads.length} ads →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/account"
            className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border border-zinc-100
                       hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center 
                            group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-300">
              <svg className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Account Settings</h3>
              <p className="text-sm text-zinc-500">Update your profile</p>
            </div>
          </Link>

          <Link
            to="/pricing"
            className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border border-zinc-100
                       hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-fuchsia-50 flex items-center justify-center 
                            group-hover:from-purple-500 group-hover:to-fuchsia-500 transition-all duration-300">
              <svg className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Upgrade Plan</h3>
              <p className="text-sm text-zinc-500">Unlock premium features</p>
            </div>
          </Link>

          <Link
            to="/my-ads"
            className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border border-zinc-100
                       hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-50 flex items-center justify-center 
                            group-hover:from-amber-500 group-hover:to-yellow-500 transition-all duration-300">
              <svg className="w-6 h-6 text-amber-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Boost Ads</h3>
              <p className="text-sm text-zinc-500">Promote your listings</p>
            </div>
          </Link>

          <Link
            to="/saved"
            className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border border-zinc-100
                       hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-rose-50 flex items-center justify-center 
                            group-hover:from-pink-500 group-hover:to-rose-500 transition-all duration-300">
              <svg className="w-6 h-6 text-pink-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Saved Listings</h3>
              <p className="text-sm text-zinc-500">View favorites</p>
            </div>
          </Link>

          <Link
            to="/"
            className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border border-zinc-100
                       hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center 
                            group-hover:from-blue-500 group-hover:to-indigo-500 transition-all duration-300">
              <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Browse Listings</h3>
              <p className="text-sm text-zinc-500">Explore marketplace</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer */}
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
