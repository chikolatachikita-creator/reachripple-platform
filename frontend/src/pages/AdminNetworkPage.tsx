import React, { useState, useEffect, useCallback } from "react";
import {
  getNetworkStats,
  getNetworkClusters,
  getInvestigationCases,
  triggerClusterScan,
  updateInvestigationCase,
  getUserNetwork,
} from "../api/admin";
import { useToastContext } from "../context/ToastContextGlobal";

// ─── Stat Card ────────────────────────────────────────────
const Stat = ({ label, value, accent }: { label: string; value: number | string; accent?: string }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${accent || "text-gray-900"}`}>{value}</p>
  </div>
);

// ─── Cluster Card ─────────────────────────────────────────
const ClusterCard = ({
  cluster,
  onInspect,
}: {
  cluster: any;
  onInspect: (userId: string) => void;
}) => {
  const sizeColor =
    cluster.size >= 10
      ? "text-red-600 bg-red-50"
      : cluster.size >= 6
      ? "text-orange-600 bg-orange-50"
      : cluster.size >= 3
      ? "text-yellow-600 bg-yellow-50"
      : "text-blue-600 bg-blue-50";

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-400">{cluster.clusterId}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sizeColor}`}>
          {cluster.size} accounts
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {cluster.signalTypes.map((t: string) => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
            {t}
          </span>
        ))}
      </div>
      <div className="text-xs text-gray-500 mb-2">{cluster.edgeCount} connection(s)</div>
      <div className="flex flex-wrap gap-1">
        {cluster.memberIds.slice(0, 5).map((id: string) => (
          <button
            key={id}
            onClick={() => onInspect(id)}
            className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition font-mono"
          >
            {id.slice(-6)}
          </button>
        ))}
        {cluster.memberIds.length > 5 && (
          <span className="text-[10px] text-gray-400">+{cluster.memberIds.length - 5} more</span>
        )}
      </div>
    </div>
  );
};

// ─── Case Row ─────────────────────────────────────────────
const priorityColor: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

const statusColor: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  escalated: "bg-red-100 text-red-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const CaseRow = ({
  c,
  onUpdateStatus,
}: {
  c: any;
  onUpdateStatus: (id: string, status: string) => void;
}) => (
  <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition">
    <td className="py-3 px-4 text-xs font-mono text-gray-500">{c.caseNumber}</td>
    <td className="py-3 px-4">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColor[c.priority] || ""}`}>
        {c.priority?.toUpperCase()}
      </span>
    </td>
    <td className="py-3 px-4 text-sm text-gray-800 max-w-xs truncate">{c.title}</td>
    <td className="py-3 px-4 text-xs text-gray-500">{c.type}</td>
    <td className="py-3 px-4">
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor[c.status] || ""}`}>
        {c.status}
      </span>
    </td>
    <td className="py-3 px-4 text-xs text-gray-500">
      {c.relatedUsers?.length || 0} users
    </td>
    <td className="py-3 px-4">
      <select
        value={c.status}
        onChange={(e) => onUpdateStatus(c._id, e.target.value)}
        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
      >
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="escalated">Escalated</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
    </td>
  </tr>
);

// ─── Network Inspector Modal ──────────────────────────────
const NetworkInspector = ({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserNetwork(userId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Network: {userId.slice(-8)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Risk & Scam scores */}
            <div className="grid grid-cols-2 gap-3">
              {data.riskProfile && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Risk Score</p>
                  <p className="text-xl font-bold text-gray-800">{data.riskProfile.riskScore}</p>
                  <p className="text-xs text-gray-500">{data.riskProfile.riskLevel}</p>
                </div>
              )}
              {data.signal && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Scam Score</p>
                  <p className="text-xl font-bold text-gray-800">{data.signal.scamScore}</p>
                </div>
              )}
            </div>

            {/* Signal summary */}
            {data.signal && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">Signals</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>Phones: <span className="font-bold">{data.signal.phoneNumbers}</span></div>
                  <div>IPs: <span className="font-bold">{data.signal.ipAddresses}</span></div>
                  <div>Devices: <span className="font-bold">{data.signal.deviceFingerprints}</span></div>
                  <div>Images: <span className="font-bold">{data.signal.imageHashes}</span></div>
                  <div className="col-span-2">Cities: <span className="font-bold">{data.signal.citiesPosted?.join(", ") || "—"}</span></div>
                </div>
              </div>
            )}

            {/* Cluster info */}
            {data.cluster && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-600 mb-1">Part of cluster: {data.cluster.clusterId}</p>
                <p className="text-xs text-red-500">{data.cluster.size} accounts in network</p>
              </div>
            )}

            {/* Graph edges */}
            {data.graph?.edges?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Connections ({data.graph.edges.length})</p>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {data.graph.edges.map((e: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1">
                      <span className="font-mono text-gray-400">{e.from.slice(-6)}</span>
                      <span className="text-gray-300">↔</span>
                      <span className="font-mono text-gray-400">{e.to.slice(-6)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 text-[10px] font-medium">{e.type}</span>
                      <span className="text-gray-300 ml-auto">str: {e.strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connected users */}
            {data.graph?.nodes?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Connected Users ({data.graph.nodes.length})</p>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {data.graph.nodes.map((n: any) => (
                    <div key={n.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1">
                      <span className="font-mono text-gray-400">{n.id.slice(-8)}</span>
                      {n.user && (
                        <>
                          <span className="text-gray-700">{n.user.name}</span>
                          <span className="text-gray-400">{n.user.email}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No network data found for this user.</p>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────
export default function AdminNetworkPage() {
  const { showSuccess, showError } = useToastContext();
  const [stats, setStats] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [caseFilter, setCaseFilter] = useState("open");

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, clustersData, casesData] = await Promise.all([
        getNetworkStats(),
        getNetworkClusters(),
        getInvestigationCases({ status: caseFilter !== "all" ? caseFilter : undefined }),
      ]);
      setStats(statsData);
      setClusters(clustersData.clusters || []);
      setCases(casesData.cases || []);
    } catch {
      showError("Failed to load network data");
    } finally {
      setLoading(false);
    }
  }, [caseFilter, showError]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleScan = async () => {
    try {
      setScanning(true);
      const result = await triggerClusterScan();
      showSuccess(`Scan complete: ${result.report?.totalClusters || 0} clusters found, ${result.report?.casesCreated || 0} cases created`);
      fetchAll();
    } catch {
      showError("Cluster scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleCaseStatusUpdate = async (caseId: string, status: string) => {
    try {
      await updateInvestigationCase(caseId, { status });
      showSuccess("Case updated");
      fetchAll();
    } catch {
      showError("Failed to update case");
    }
  };

  // ─── Loading skeleton ──────
  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Network Detection</h1>
          <p className="text-sm text-gray-500 mt-1">Advertiser network graph, clusters &amp; investigations</p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {scanning ? "Scanning…" : "Run Cluster Scan"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Stat label="Total Edges" value={stats.totalEdges || 0} />
          <Stat label="Clusters" value={stats.totalClusters || 0} accent="text-orange-600" />
          <Stat label="Open Cases" value={stats.openCases || 0} accent="text-blue-600" />
          <Stat label="Critical Cases" value={stats.criticalCases || 0} accent="text-red-600" />
          <Stat label="High Scam Users" value={stats.highScamUsers || 0} accent="text-red-600" />
          <Stat label="Tracked Users" value={stats.totalSignals || 0} />
        </div>
      )}

      {/* Signal Distribution */}
      {stats?.signalDistribution?.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Signal Distribution</h2>
          <div className="flex flex-wrap gap-3">
            {stats.signalDistribution.map((s: any) => (
              <div key={s.type} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-gray-600">{s.type}</span>
                <span className="text-sm font-bold text-gray-800">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clusters */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Detected Clusters ({clusters.length})
        </h2>
        {clusters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.map((cluster) => (
              <ClusterCard
                key={cluster.clusterId}
                cluster={cluster}
                onInspect={(userId) => setInspectUserId(userId)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No clusters detected yet. Run a scan to analyse the network.</p>
        )}
      </div>

      {/* Investigation Cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Investigation Cases</h2>
          <select
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {cases.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase">Case #</th>
                  <th className="py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase">Priority</th>
                  <th className="py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase">Title</th>
                  <th className="py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase">Type</th>
                  <th className="py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase">Status</th>
                  <th className="py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase">Users</th>
                  <th className="py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <CaseRow key={c._id} c={c} onUpdateStatus={handleCaseStatusUpdate} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No investigation cases matching filter.</p>
        )}
      </div>

      {/* Network Inspector Modal */}
      {inspectUserId && (
        <NetworkInspector userId={inspectUserId} onClose={() => setInspectUserId(null)} />
      )}
    </div>
  );
}
