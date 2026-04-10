import React, { useEffect, useState, useCallback } from "react";
import {
  getModerationQueue,
  moderateAd,
  getRiskUsers,
  getModerationStats,
  triggerPatternScan,
  recalculateUserRisk,
  ModerationAd,
  RiskUser,
  ModerationStats,
} from "../api/admin";
import { useToastContext } from "../context/ToastContextGlobal";
import Pagination from "../components/ui/Pagination";

type TabKey = "queue" | "risk-users" | "stats";

// ─────── Moderation status badge ───────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    flagged: "bg-red-100 text-red-800 border-red-300",
    pending_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
    under_investigation: "bg-orange-100 text-orange-800 border-orange-300",
    auto_approved: "bg-green-100 text-green-800 border-green-300",
    approved: "bg-green-100 text-green-700 border-green-300",
    rejected: "bg-gray-100 text-gray-800 border-gray-300",
    suspended: "bg-red-200 text-red-900 border-red-400",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─────── Risk level badge ───────
function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-200 text-red-900",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${colors[level] || "bg-gray-100"}`}>
      {level.toUpperCase()}
    </span>
  );
}

export default function AdminModerationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("queue");
  const { showSuccess, showError } = useToastContext();

  // Queue state
  const [queueAds, setQueueAds] = useState<ModerationAd[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queuePage, setQueuePage] = useState(1);
  const [queueTotalPages, setQueueTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Risk users state
  const [riskUsers, setRiskUsers] = useState<RiskUser[]>([]);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskPage, setRiskPage] = useState(1);
  const [riskTotalPages, setRiskTotalPages] = useState(1);
  const [riskLevelCounts, setRiskLevelCounts] = useState<Record<string, number>>({});
  const [riskLevelFilter, setRiskLevelFilter] = useState("");

  // Stats state
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  // ─── Load queue ───
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const params: any = { page: queuePage, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const data = await getModerationQueue(params);
      setQueueAds(data.ads || []);
      setQueueTotalPages(data.pagination?.totalPages || 1);
      setStatusCounts(data.statusCounts || {});
    } catch {
      showError("Failed to load moderation queue");
    } finally {
      setQueueLoading(false);
    }
  }, [queuePage, statusFilter, showError]);

  // ─── Load risk users ───
  const loadRiskUsers = useCallback(async () => {
    setRiskLoading(true);
    try {
      const params: any = { page: riskPage, limit: 15 };
      if (riskLevelFilter) params.level = riskLevelFilter;
      const data = await getRiskUsers(params);
      setRiskUsers(data.users || []);
      setRiskTotalPages(data.pagination?.totalPages || 1);
      setRiskLevelCounts(data.riskLevelCounts || {});
    } catch {
      showError("Failed to load risk users");
    } finally {
      setRiskLoading(false);
    }
  }, [riskPage, riskLevelFilter, showError]);

  // ─── Load stats ───
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getModerationStats();
      setStats(data);
    } catch {
      showError("Failed to load moderation stats");
    } finally {
      setStatsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (activeTab === "queue") loadQueue();
    if (activeTab === "risk-users") loadRiskUsers();
    if (activeTab === "stats") loadStats();
  }, [activeTab, loadQueue, loadRiskUsers, loadStats]);

  // ─── Moderation action ───
  const handleModerateAction = async (adId: string, action: string) => {
    setActionLoading(`${adId}-${action}`);
    try {
      const result = await moderateAd(adId, { action, note: noteInput || undefined });
      showSuccess(result.message || `Ad ${action}d`);
      setExpandedAdId(null);
      setNoteInput("");
      loadQueue();
    } catch (err: any) {
      showError(err?.response?.data?.error || `Failed to ${action} ad`);
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Pattern scan ───
  const handlePatternScan = async () => {
    setScanLoading(true);
    try {
      const result = await triggerPatternScan();
      showSuccess(result.message || "Pattern scan completed");
      loadStats();
    } catch {
      showError("Pattern scan failed");
    } finally {
      setScanLoading(false);
    }
  };

  // ─── Recalculate risk ───
  const handleRecalcRisk = async (userId: string) => {
    try {
      await recalculateUserRisk(userId);
      showSuccess("Risk recalculated");
      loadRiskUsers();
    } catch {
      showError("Failed to recalculate risk");
    }
  };

  // ══════════════════════════════════
  // Tab: Moderation Queue
  // ══════════════════════════════════
  const renderQueue = () => (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: "", label: "All Actionable" },
          { key: "flagged", label: "Flagged" },
          { key: "pending_review", label: "Pending Review" },
          { key: "under_investigation", label: "Under Investigation" },
          { key: "suspended", label: "Suspended" },
          { key: "rejected", label: "Rejected" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setQueuePage(1); }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            {tab.key && statusCounts[tab.key] ? ` (${statusCounts[tab.key]})` : ""}
          </button>
        ))}
      </div>

      {queueLoading ? (
        <div className="text-center py-12 text-gray-500">Loading moderation queue...</div>
      ) : queueAds.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No ads in moderation queue</div>
      ) : (
        <div className="space-y-3">
          {queueAds.map(ad => (
            <div key={ad._id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedAdId(expandedAdId === ad._id ? null : ad._id)}
              >
                {/* Thumbnail */}
                {ad.images?.[0] && (
                  <img
                    src={ad.images[0].startsWith("http") ? ad.images[0] : `${process.env.REACT_APP_API_URL || ""}${ad.images[0]}`}
                    alt=""
                    className="w-14 h-14 rounded object-cover flex-shrink-0"
                  />
                )}

                {/* Title & user */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{ad.title || "Untitled"}</div>
                  <div className="text-xs text-gray-500">
                    {ad.userId?.name || "Unknown"} &bull; {ad.userId?.email || ""} &bull; {ad.location || ""}
                  </div>
                </div>

                {/* Risk score */}
                <div className="text-center">
                  <div className={`text-lg font-bold ${(ad.moderationScore || 0) >= 30 ? "text-red-600" : (ad.moderationScore || 0) >= 15 ? "text-orange-500" : "text-gray-600"}`}>
                    {ad.moderationScore || 0}
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase">Risk</div>
                </div>

                {/* Status */}
                <StatusBadge status={ad.moderationStatus} />

                {/* User risk level */}
                {ad.userId?.riskLevel && (
                  <RiskBadge level={ad.userId.riskLevel} />
                )}

                {/* Expand chevron */}
                <span className="text-gray-400 text-sm">{expandedAdId === ad._id ? "▲" : "▼"}</span>
              </div>

              {/* Expanded detail */}
              {expandedAdId === ad._id && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  {/* Flags */}
                  {ad.moderationFlags && ad.moderationFlags.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1 uppercase">Flags</div>
                      <div className="flex flex-wrap gap-1">
                        {ad.moderationFlags.map((flag, i) => (
                          <span key={i} className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded border border-red-200">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous notes */}
                  {ad.moderationNote && (
                    <div className="mb-3 text-sm text-gray-600">
                      <span className="font-medium">Previous note:</span> {ad.moderationNote}
                    </div>
                  )}

                  {/* User details */}
                  <div className="mb-3 text-xs text-gray-500">
                    Phone: {ad.phone || "N/A"} | Verification: {ad.userId?.idVerificationStatus || "N/A"} |
                    Created: {new Date(ad.createdAt).toLocaleDateString()}
                    {ad.moderationReviewedAt && (
                      <> | Last reviewed: {new Date(ad.moderationReviewedAt).toLocaleDateString()} by {ad.moderationReviewedBy?.name || "system"}</>
                    )}
                  </div>

                  {/* Notes input */}
                  <textarea
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    placeholder="Add moderation note (optional)..."
                    className="w-full border rounded p-2 text-sm mb-3 focus:ring-2 focus:ring-indigo-300 outline-none"
                    rows={2}
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleModerateAction(ad._id, "approve")}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === `${ad._id}-approve` ? "..." : "✓ Approve"}
                    </button>
                    <button
                      onClick={() => handleModerateAction(ad._id, "reject")}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === `${ad._id}-reject` ? "..." : "✗ Reject"}
                    </button>
                    <button
                      onClick={() => handleModerateAction(ad._id, "investigate")}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 disabled:opacity-50"
                    >
                      {actionLoading === `${ad._id}-investigate` ? "..." : "🔍 Investigate"}
                    </button>
                    <button
                      onClick={() => handleModerateAction(ad._id, "suspend")}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 bg-red-800 text-white text-sm rounded hover:bg-red-900 disabled:opacity-50"
                    >
                      {actionLoading === `${ad._id}-suspend` ? "..." : "⛔ Suspend"}
                    </button>
                    {ad.moderationStatus === "flagged" && (
                      <button
                        onClick={() => handleModerateAction(ad._id, "unflag")}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 disabled:opacity-50"
                      >
                        Unflag
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {queueTotalPages > 1 && (
        <div className="mt-4">
          <Pagination currentPage={queuePage} totalPages={queueTotalPages} onPageChange={setQueuePage} />
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════
  // Tab: Risk Users
  // ══════════════════════════════════
  const renderRiskUsers = () => (
    <div>
      {/* Level filter */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "", label: "Medium+" },
          { key: "critical", label: "Critical" },
          { key: "high", label: "High" },
          { key: "medium", label: "Medium" },
          { key: "low", label: "Low" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setRiskLevelFilter(tab.key); setRiskPage(1); }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              riskLevelFilter === tab.key
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            {tab.key && riskLevelCounts[tab.key] ? ` (${riskLevelCounts[tab.key]})` : ""}
          </button>
        ))}
      </div>

      {riskLoading ? (
        <div className="text-center py-12 text-gray-500">Loading risk users...</div>
      ) : riskUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No users at this risk level</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 text-xs uppercase">
                <th className="p-3">User</th>
                <th className="p-3">Risk Score</th>
                <th className="p-3">Level</th>
                <th className="p-3">Verification</th>
                <th className="p-3">Rejected Ads</th>
                <th className="p-3">Review</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {riskUsers.map(user => (
                <tr key={user._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{user.name || "—"}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="p-3">
                    <span className={`font-bold ${user.riskScore >= 80 ? "text-red-600" : user.riskScore >= 50 ? "text-orange-500" : user.riskScore >= 25 ? "text-yellow-600" : "text-green-600"}`}>
                      {user.riskScore || 0}
                    </span>
                  </td>
                  <td className="p-3"><RiskBadge level={user.riskLevel} /></td>
                  <td className="p-3 text-xs">{user.idVerificationStatus || "N/A"}</td>
                  <td className="p-3">{user.adsRejectedCount || 0}</td>
                  <td className="p-3">
                    {user.isUnderReview && (
                      <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded">Under Review</span>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleRecalcRisk(user._id)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Recalculate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {riskTotalPages > 1 && (
        <div className="mt-4">
          <Pagination currentPage={riskPage} totalPages={riskTotalPages} onPageChange={setRiskPage} />
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════
  // Tab: Stats / Overview
  // ══════════════════════════════════
  const renderStats = () => (
    <div>
      {statsLoading ? (
        <div className="text-center py-12 text-gray-500">Loading stats...</div>
      ) : !stats ? (
        <div className="text-center py-12 text-gray-400">No stats available</div>
      ) : (
        <div className="space-y-6">
          {/* Queue size summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="text-sm text-indigo-600 font-medium">Queue Size</div>
            <div className="text-3xl font-bold text-indigo-800">{stats.queueSize}</div>
            <div className="text-xs text-indigo-500">Ads needing attention</div>
          </div>

          {/* Moderation status breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">Ad Moderation Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.moderation).map(([status, data]) => (
                <div key={status} className="bg-white border rounded-lg p-3">
                  <StatusBadge status={status} />
                  <div className="text-xl font-bold text-gray-800 mt-1">{data.count}</div>
                  <div className="text-xs text-gray-400">Avg score: {data.avgScore}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk level breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">User Risk Levels</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.riskLevels).map(([level, data]) => (
                <div key={level} className="bg-white border rounded-lg p-3">
                  <RiskBadge level={level} />
                  <div className="text-xl font-bold text-gray-800 mt-1">{data.count}</div>
                  <div className="text-xs text-gray-400">Avg risk: {data.avgRiskScore}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pattern scan button */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Manual Pattern Scan</h3>
            <p className="text-xs text-gray-500 mb-3">
              Run the anti-trafficking pattern detection across all active ads. This checks phone reuse, image reuse, city hopping, report clusters, and template ads.
            </p>
            <button
              onClick={handlePatternScan}
              disabled={scanLoading}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {scanLoading ? "Scanning..." : "Run Pattern Scan"}
            </button>
          </div>

          {/* Recent audit actions */}
          {stats.recentActions && stats.recentActions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">Recent Moderation Activity</h3>
              <div className="bg-white border rounded-lg divide-y max-h-80 overflow-y-auto">
                {stats.recentActions.slice(0, 20).map((action: any, i: number) => (
                  <div key={i} className="px-4 py-2 text-sm flex items-center gap-3">
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(action.createdAt).toLocaleString()}
                    </span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      action.action.includes("REJECT") || action.action.includes("SUSPEND")
                        ? "bg-red-100 text-red-700"
                        : action.action.includes("APPROVE")
                          ? "bg-green-100 text-green-700"
                          : action.action.includes("FLAG") || action.action.includes("RED_FLAG")
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-700"
                    }`}>
                      {action.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-gray-600 truncate">{action.reason || ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════
  // Main render
  // ══════════════════════════════════
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Content Moderation</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b">
        {([
          { key: "queue", label: "Moderation Queue" },
          { key: "risk-users", label: "Risk Users" },
          { key: "stats", label: "Overview & Stats" },
        ] as { key: TabKey; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "queue" && renderQueue()}
      {activeTab === "risk-users" && renderRiskUsers()}
      {activeTab === "stats" && renderStats()}
    </div>
  );
}
