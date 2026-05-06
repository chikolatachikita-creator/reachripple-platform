/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAdminAds, AdminAd, updateAdStatus, deleteAdminAd, setAdTier, removeAdBoost, PlacementTier } from "../api/admin";
import { getAssetUrl } from "../config/api";
import { useConfirmModal } from "../components/ConfirmModal";
import { useToastContext } from "../context/ToastContextGlobal";
import Pagination from "../components/ui/Pagination";

export default function AdminAdsPage() {
  const location = useLocation();
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { confirm, setIsLoading: setModalLoading, ConfirmModal } = useConfirmModal();
  const { showSuccess, showError } = useToastContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [previewAd, setPreviewAd] = useState<AdminAd | null>(null);
  const [boostingAd, setBoostingAd] = useState<AdminAd | null>(null);
  const [boostTier, setBoostTier] = useState<PlacementTier>("FEATURED");
  const [boostDays, setBoostDays] = useState<number>(7);
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  const limit = 10;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    if (status) {
      setStatusFilter(status);
    }
  }, [location.search]);

  const loadAds = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;

      const data = await getAdminAds(params);
      setAds(data.ads);
      setTotal(data.total);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "Failed to load ads. Please try again.";
      setError(errorMessage);
      console.error("Load ads error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAds();
  };

  const handleAction = async (id: string, action: "approve" | "reject" | "delete") => {
    const actionConfig = {
      approve: {
        title: "Approve Ad",
        message: "Are you sure you want to approve this ad?",
        type: "info" as const,
        successMsg: "Ad approved successfully",
      },
      reject: {
        title: "Reject Ad",
        message: "Are you sure you want to reject this ad?",
        type: "warning" as const,
        successMsg: "Ad rejected successfully",
      },
      delete: {
        title: "Delete Ad",
        message: "Are you sure you want to delete this ad? This action cannot be undone.",
        type: "danger" as const,
        successMsg: "Ad deleted successfully",
      },
    };

    const config = actionConfig[action];

    const confirmed = await confirm({
      title: config.title,
      message: config.message,
      type: config.type,
    });

    if (!confirmed) return;

    setModalLoading(true);
    setActionLoading(`${id}:${action}`);
    setError(null);
    try {
      if (action === "approve") {
        await updateAdStatus(id, "approved");
      } else if (action === "reject") {
        await updateAdStatus(id, "rejected");
      } else if (action === "delete") {
        await deleteAdminAd(id);
      }
      showSuccess(config.successMsg);
      await loadAds();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "Action failed";
      setError(errorMessage);
      showError(errorMessage);
      console.error("Ad action error:", err);
    } finally {
      setActionLoading(null);
      setModalLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const openBoostModal = (ad: AdminAd) => {
    setBoostingAd(ad);
    setBoostTier((ad.tier as PlacementTier) || "FEATURED");
    setBoostDays(7);
  };

  const handleApplyBoost = async () => {
    if (!boostingAd) return;
    setBoostSubmitting(true);
    try {
      const { ad: updated } = await setAdTier(boostingAd._id, boostTier, boostDays);
      setAds(prev => prev.map(a => a._id === updated._id ? { ...a, ...updated } : a));
      showSuccess(`Boosted to ${boostTier} for ${boostDays} day(s)`);
      setBoostingAd(null);
    } catch (err: any) {
      showError(err?.response?.data?.error || "Failed to boost ad");
    } finally {
      setBoostSubmitting(false);
    }
  };

  const handleRemoveBoost = async () => {
    if (!boostingAd) return;
    setBoostSubmitting(true);
    try {
      const { ad: updated } = await removeAdBoost(boostingAd._id);
      setAds(prev => prev.map(a => a._id === updated._id ? { ...a, ...updated } : a));
      showSuccess("Boost removed");
      setBoostingAd(null);
    } catch (err: any) {
      showError(err?.response?.data?.error || "Failed to remove boost");
    } finally {
      setBoostSubmitting(false);
    }
  };

  const tierBadge = (ad: AdminAd) => {
    const tier = ad.tier;
    if (!tier || tier === "STANDARD") return null;
    const styles: Record<string, string> = {
      FEATURED: "bg-amber-100 text-amber-800 border-amber-300",
      PRIORITY_PLUS: "bg-purple-100 text-purple-800 border-purple-300",
      PRIORITY: "bg-blue-100 text-blue-800 border-blue-300",
    };
    const labels: Record<string, string> = {
      FEATURED: "⭐ Featured",
      PRIORITY_PLUS: "🚀 Priority+",
      PRIORITY: "↑ Priority",
    };
    const expired = ad.tierUntil && new Date(ad.tierUntil) < new Date();
    return (
      <span
        className={`ml-2 inline-block px-2 py-0.5 text-[10px] font-semibold rounded border ${styles[tier]} ${expired ? "opacity-50 line-through" : ""}`}
        title={ad.tierUntil ? `Until ${new Date(ad.tierUntil).toLocaleString()}` : undefined}
      >
        {labels[tier]}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      rejected: "bg-red-100 text-red-700",
    };
    const icons: Record<string, string> = {
      approved: "✅",
      pending: "⏳",
      rejected: "❌",
    };
    return (
      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin Ads Moderation</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <ConfirmModal />

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <input
              type="text"
              placeholder="Search ads by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 p-3 rounded-lg w-full max-w-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </form>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            title="Filter by status"
            aria-label="Filter by status"
          >
            <option value="">Status: All</option>
            <option value="approved">✅ Approved</option>
            <option value="pending">⏳ Pending</option>
            <option value="rejected">❌ Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="overflow-x-auto animate-pulse">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  {['Image', 'Title', 'Category', 'Location', 'Price', 'Status', 'Posted', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b">
                    <td className="px-6 py-4"><div className="h-12 w-12 bg-gray-200 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-yellow-100 rounded-full w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="flex gap-2"><div className="h-4 bg-gray-100 rounded w-12" /><div className="h-4 bg-gray-100 rounded w-12" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📢</div>
            <h3 className="font-semibold text-gray-900">No Ads Found</h3>
            <p className="text-gray-600">No ads match your filters or search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Image</th>
                  <th className="px-6 py-3">Ad Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Posted</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad._id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {ad.images && ad.images.length > 0 ? (
                        <img src={getAssetUrl(ad.images[0])} alt={ad.title} className="h-12 w-12 object-cover rounded-lg" />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">No img</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-purple-700 text-sm">
                        {ad.title}
                        {tierBadge(ad)}
                      </div>
                      {ad.images && ad.images.length > 0 && (
                        <div className="text-xs text-gray-500">{ad.images.length} image(s)</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">{ad.category}</td>
                    <td className="px-6 py-4 text-sm">{ad.location}</td>
                    <td className="px-6 py-4 text-sm font-medium">£{ad.price}</td>
                    <td className="px-6 py-4">{getStatusBadge(ad.status)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(ad.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => setPreviewAd(ad)} className="text-blue-500 text-sm mr-2 hover:underline font-medium">
                        View Details
                      </button>
                      {ad.status === "approved" && (
                        <button
                          onClick={() => openBoostModal(ad)}
                          className="text-amber-600 text-sm mr-2 hover:underline font-medium"
                          title="Promote this listing to a higher placement tier"
                        >
                          {ad.tier && ad.tier !== "STANDARD" ? "Re-boost" : "Boost"}
                        </button>
                      )}
                      {ad.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(ad._id, "approve")}
                            disabled={actionLoading === `${ad._id}:approve`}
                            className="text-green-500 text-sm mr-2 hover:underline disabled:opacity-50"
                          >
                            {actionLoading === `${ad._id}:approve` ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleAction(ad._id, "reject")}
                            disabled={actionLoading === `${ad._id}:reject`}
                            className="text-orange-500 text-sm mr-2 hover:underline disabled:opacity-50"
                          >
                            {actionLoading === `${ad._id}:reject` ? "..." : "Reject"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleAction(ad._id, "delete")}
                        disabled={actionLoading === `${ad._id}:delete`}
                        className="text-red-500 text-sm hover:underline disabled:opacity-50"
                      >
                        {actionLoading === `${ad._id}:delete` ? "..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between mt-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} ads
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              size="sm"
              variant="default"
              siblingCount={1}
            />
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ad Preview</h2>
                <div className="text-sm text-gray-500">ID: {previewAd._id}</div>
              </div>
              <button 
                onClick={() => setPreviewAd(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{previewAd.title}</h3>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(previewAd.status)}
                    <span className="text-sm text-gray-500">• {formatDate(previewAd.createdAt)}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  £{previewAd.price}
                </div>
              </div>

              {/* Images */}
              {previewAd.images && previewAd.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {previewAd.images.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt={`Preview ${idx}`} 
                      className="w-full h-40 object-cover rounded-xl border border-gray-100 hover:opacity-90 transition-opacity cursor-pointer"
                      onClick={() => window.open(img, '_blank')}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500 border border-dashed border-gray-300">
                  No images uploaded
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
                  <div className="text-gray-900 font-medium">{previewAd.category}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Location</label>
                  <div className="text-gray-900 font-medium">{previewAd.location}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">User ID</label>
                  <div className="text-gray-900 font-medium font-mono text-xs">
                    {(typeof previewAd.userId === 'object' ? previewAd.userId?._id : previewAd.userId) || "N/A"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Contact</label>
                  <div className="text-gray-900 font-medium">{previewAd.phone || previewAd.email || "N/A"}</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Description</label>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap bg-white border border-gray-100 p-4 rounded-xl">
                  {previewAd.description}
                </div>
              </div>

               {/* Services */}
               {((previewAd as any).services || (previewAd as any).selectedServices) && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Services</label>
                  <div className="flex flex-wrap gap-2">
                    {((previewAd as any).services || (previewAd as any).selectedServices || []).map((s: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md border border-purple-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer - Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
              <button
                onClick={() => setPreviewAd(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium transition-colors"
                disabled={!!actionLoading}
              >
                Close
              </button>
              <div className="flex gap-3">
                {previewAd.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleAction(previewAd._id, "reject");
                        setPreviewAd(null);
                      }}
                      disabled={!!actionLoading}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors border border-red-200"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        handleAction(previewAd._id, "approve");
                        setPreviewAd(null);
                      }}
                      disabled={!!actionLoading}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
                    >
                      Approve Ad
                    </button>
                  </>
                )}
                {/* Always show delete option even in preview */}
                 <button
                    onClick={() => {
                      handleAction(previewAd._id, "delete");
                      setPreviewAd(null);
                    }}
                    disabled={!!actionLoading}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
                  >
                    Delete
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOOST MODAL */}
      {boostingAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Boost Listing</h2>
                <div className="text-sm text-gray-500 truncate max-w-xs">{boostingAd.title}</div>
              </div>
              <button
                onClick={() => setBoostingAd(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {boostingAd.tier && boostingAd.tier !== "STANDARD" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                  Currently <strong>{boostingAd.tier}</strong>
                  {boostingAd.tierUntil && (
                    <> until {new Date(boostingAd.tierUntil).toLocaleString()}</>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                  Placement Tier
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    { key: "FEATURED", label: "⭐ Featured", desc: "Top of carousel — maximum visibility" },
                    { key: "PRIORITY_PLUS", label: "🚀 Priority Plus", desc: "Above standard & priority" },
                    { key: "PRIORITY", label: "↑ Priority", desc: "Above standard listings" },
                    { key: "STANDARD", label: "Standard", desc: "Normal placement (removes boost)" },
                  ] as { key: PlacementTier; label: string; desc: string }[]).map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setBoostTier(opt.key)}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                        boostTier === opt.key
                          ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {boostTier !== "STANDARD" && (
                <div>
                  <label htmlFor="boost-days" className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                    Duration (days)
                  </label>
                  <div className="flex gap-2">
                    {[1, 3, 7, 14, 30].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setBoostDays(d)}
                        className={`flex-1 px-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          boostDays === d
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <input
                    id="boost-days"
                    type="number"
                    min={1}
                    max={365}
                    value={boostDays}
                    onChange={(e) => setBoostDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                    className="mt-2 border border-gray-300 p-2 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-100 bg-gray-50">
              {boostingAd.tier && boostingAd.tier !== "STANDARD" ? (
                <button
                  onClick={handleRemoveBoost}
                  disabled={boostSubmitting}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium border border-red-200 disabled:opacity-50"
                >
                  Remove boost
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button
                  onClick={() => setBoostingAd(null)}
                  disabled={boostSubmitting}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyBoost}
                  disabled={boostSubmitting}
                  className="px-5 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-sm disabled:opacity-50"
                >
                  {boostSubmitting ? "Applying..." : boostTier === "STANDARD" ? "Set to Standard" : `Apply (${boostDays}d)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
