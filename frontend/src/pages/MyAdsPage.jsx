// src/pages/MyAdsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import NotificationsBanner from "../components/NotificationsBanner";
import BoostModal from "../components/BoostModal";
import ConfirmModal from "../components/ConfirmModal";
import { useToastContext } from "../context/ToastContextGlobal";
import { getAssetUrl } from "../config/api";

const getImageUrl = (path) => getAssetUrl(path);

const STATUS_COLORS = {
  draft: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
  hidden: "bg-purple-50 text-purple-700 border border-purple-200",
};

const STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending Review",
  approved: "Live",
  rejected: "Rejected",
  hidden: "Hidden",
};

export default function MyAdsPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastContext();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [postingLimits, setPostingLimits] = useState(null);

  const openBoostModal = (ad) => {
    setSelectedAd(ad);
    setBoostModalOpen(true);
  };

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  const fetchMyAds = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await api.get("/ads/my");
      setAds(res.data.ads || []);
      // Fetch posting limits
      try {
        const limitsRes = await api.get("/ads/posting-limits");
        setPostingLimits(limitsRes.data);
      } catch { /* non-critical */ }
    } catch (err) {
      showError("Failed to load your ads. Please try again.");
      setError("Failed to load your ads");
    } finally {
      setLoading(false);
    }
  }, [navigate, showError]);

  useEffect(() => {
    fetchMyAds();
  }, [fetchMyAds]);

  const handleStatusChange = async (adId, newStatus) => {
    try {
      setActionLoading(adId);
      
      await api.patch(`/ads/${adId}/status`, 
        { status: newStatus }
      );

      // Update local state
      setAds(ads.map(ad => 
        ad._id === adId ? { ...ad, status: newStatus } : ad
      ));
      showSuccess(`Ad ${newStatus === 'hidden' ? 'hidden' : 'updated'} successfully`);
    } catch (err) {
      showError("Failed to update ad status");
      setError("Failed to update ad status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (adId) => {
    setDeleteTarget(adId);
  };

  const confirmDelete = async () => {
    const adId = deleteTarget;
    setDeleteTarget(null);

    try {
      setActionLoading(adId);
      
      await api.delete(`/ads/${adId}/user`);

      // Remove from local state
      setAds(ads.filter(ad => ad._id !== adId));
      showSuccess("Ad deleted successfully");
    } catch (err) {
      showError("Failed to delete ad");
      setError("Failed to delete ad");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white transition-all duration-500 ${fadeIn ? "opacity-100" : "opacity-0 translate-y-2"}`}>
      <Helmet><title>My Ads | ReachRipple</title></Helmet>
      {/* Modern Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow" />
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight"><span className="text-pink-500">Reach</span><span className="text-purple-600">Ripple</span></div>
              <div className="text-[11px] text-zinc-400 leading-tight">My Ads</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link 
              to="/dashboard" 
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
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
              <span className="hidden sm:inline">New Ad</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Notifications Banner */}
        <NotificationsBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900">My Ads</h1>
              <p className="text-zinc-500 text-sm">
                {ads.length} listing{ads.length !== 1 ? "s" : ""}
                {postingLimits && (
                  <span className="ml-2 text-zinc-400">
                    ({postingLimits.currentCount} / {postingLimits.maxAllowed} slots used)
                  </span>
                )}
              </p>
            </div>
          </div>
          <Link
            to="/create-ad"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm
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

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-8 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button
              onClick={() => { setError(""); fetchMyAds(); }}
              className="ml-auto px-3 py-1 text-sm font-medium rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
            >
              Retry
            </button>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600" aria-label="Dismiss error">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {/* Skeleton cards for loading state */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-5 flex gap-5 animate-pulse">
                <div className="w-28 h-28 sm:w-36 sm:h-36 bg-gradient-to-br from-zinc-200 to-zinc-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-zinc-200 rounded-lg w-3/4" />
                  <div className="h-4 bg-zinc-100 rounded w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-6 bg-zinc-100 rounded-full w-20" />
                    <div className="h-6 bg-emerald-100 rounded-full w-16" />
                  </div>
                  <div className="flex gap-2 pt-3">
                    <div className="h-5 bg-zinc-50 rounded w-16" />
                    <div className="h-5 bg-zinc-50 rounded w-20" />
                  </div>
                </div>
                <div className="hidden sm:flex flex-col gap-2">
                  <div className="w-9 h-9 bg-zinc-100 rounded-xl" />
                  <div className="w-9 h-9 bg-zinc-100 rounded-xl" />
                  <div className="w-9 h-9 bg-zinc-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-12 text-center border border-zinc-100">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📭</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-800 mb-2">No Ads Yet</h2>
            <p className="text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
              Create your first ad to start getting noticed by potential clients
            </p>
            <Link
              to="/create-ad"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm
                         bg-gradient-to-r from-pink-500 to-purple-600 text-white 
                         shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 
                         hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Ad
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gradient-to-r from-zinc-50 to-white border-b border-zinc-100 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <div className="col-span-4">Ad</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Views</div>
              <div className="col-span-1 text-center">Clicks</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Ad Rows */}
            {ads.map((ad, index) => (
              <div
                key={ad._id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 border-b border-zinc-100 
                           hover:bg-zinc-50/50 transition items-center"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Ad Info */}
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-zinc-200 to-zinc-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                    {ad.images && ad.images.length > 0 ? (
                      <img
                        src={getImageUrl(ad.images[0])}
                        alt={ad.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/profile/${ad._id}`} className="font-semibold text-zinc-900 hover:text-pink-600 transition-colors line-clamp-1">
                      {ad.title}
                    </Link>
                    <p className="text-sm text-zinc-500">{ad.location} • £{ad.price}/hr</p>
                    {ad.category && ad.category !== "Escorts" && (
                      <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                        {ad.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${STATUS_COLORS[ad.status] || STATUS_COLORS.pending}`}>
                    {STATUS_LABELS[ad.status] || ad.status}
                  </span>
                  {ad.status === "rejected" && ad.rejectionReason && (
                    <p className="text-xs text-red-500 mt-1.5 line-clamp-1" title={ad.rejectionReason}>
                      {ad.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Views */}
                <div className="col-span-1 text-center hidden md:block">
                  <span className="text-zinc-900 font-bold">{ad.views || 0}</span>
                  <span className="text-xs text-zinc-400 block mt-0.5">views</span>
                </div>

                {/* Clicks */}
                <div className="col-span-1 text-center hidden md:block">
                  <span className="text-zinc-900 font-bold">{ad.clicks || 0}</span>
                  <span className="text-xs text-zinc-400 block mt-0.5">clicks</span>
                </div>

                {/* Created */}
                <div className="col-span-2 text-sm text-zinc-500 hidden md:block">
                  {formatDate(ad.createdAt)}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {actionLoading === ad._id ? (
                    <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {/* Boost (escorts only) */}
                      {ad.status === "approved" && ad.category === "escorts" && (
                        <button
                          onClick={() => openBoostModal(ad)}
                          className="p-2 rounded-lg text-purple-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                          title="Boost Ad"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </button>
                      )}

                      {/* Edit */}
                      <Link
                        to={`/edit-ad/${ad._id}`}
                        className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>

                      {/* View */}
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

                      {/* Status Actions */}
                      {ad.status === "approved" && (
                        <button
                          onClick={() => handleStatusChange(ad._id, "hidden")}
                          className="p-2 rounded-lg text-zinc-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Hide"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                      )}
                      {ad.status === "hidden" && (
                        <button
                          onClick={() => handleStatusChange(ad._id, "pending")}
                          className="p-2 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Reactivate"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
                      {(ad.status === "rejected" || ad.status === "draft") && (
                        <button
                          onClick={() => handleStatusChange(ad._id, "pending")}
                          className="p-2 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Submit for Review"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(ad._id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {ads.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-900">{ads.length}</p>
              <p className="text-sm text-zinc-500">Total Ads</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600">{ads.filter(a => a.status === "approved").length}</p>
              <p className="text-sm text-zinc-500">Live</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-black text-blue-600">{ads.reduce((sum, a) => sum + (a.views || 0), 0)}</p>
              <p className="text-sm text-zinc-500">Total Views</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-black text-pink-600">{ads.reduce((sum, a) => sum + (a.clicks || 0), 0)}</p>
              <p className="text-sm text-zinc-500">Total Clicks</p>
            </div>
          </div>
        )}
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

      {/* Boost Modal */}
      <BoostModal
        isOpen={boostModalOpen}
        onClose={() => {
          setBoostModalOpen(false);
          setSelectedAd(null);
        }}
        ad={selectedAd}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Ad"
        message="Are you sure you want to delete this ad? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
