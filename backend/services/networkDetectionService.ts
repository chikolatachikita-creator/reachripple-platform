/**
 * Network Detection Service
 *
 * Analyses the AdvertiserEdge graph to find clusters of connected accounts.
 * Uses Union-Find (disjoint-set) for efficient connected-component detection.
 *
 * Cluster risk rules:
 *   2 accounts   → monitor
 *   3–5 accounts → pre-moderation + investigation case
 *   6–9 accounts → high risk + investigation case
 *   10+ accounts → critical — potential organised operation
 *
 * Designed to run as a nightly cron job via runClusterDetection().
 */

import mongoose from "mongoose";
import AdvertiserEdge from "../models/AdvertiserEdge";
import AdvertiserSignal from "../models/AdvertiserSignal";
import InvestigationCase from "../models/InvestigationCase";
import { addRiskPoints, getRiskLevel } from "./riskScoringService";
import { AuditLog } from "../models/AuditLog";
import { logInfo, logWarn, logError } from "../utils/logger";

// ── Union-Find (Disjoint Set) ──────────────────────────────

class UnionFind {
  parent: Map<string, string>;
  rank: Map<string, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // Path compression
    let curr = x;
    while (curr !== root) {
      const next = this.parent.get(curr)!;
      this.parent.set(curr, root);
      curr = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;

    const rankA = this.rank.get(rootA) || 0;
    const rankB = this.rank.get(rootB) || 0;

    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }

  getClusters(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    for (const node of this.parent.keys()) {
      const root = this.find(node);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root)!.push(node);
    }
    return clusters;
  }
}

// ── Cluster Risk Rules ─────────────────────────────────────

interface ClusterInfo {
  clusterId: string;
  members: string[];
  size: number;
  edgeCount: number;
  signalTypes: string[];
  riskAction: string;
}

function clusterRiskAction(size: number): string {
  if (size >= 10) return "critical_investigation";
  if (size >= 6) return "high_risk_investigation";
  if (size >= 3) return "pre_moderation_investigation";
  if (size >= 2) return "monitor";
  return "none";
}

function clusterRiskPoints(size: number): number {
  if (size >= 10) return 60;
  if (size >= 6) return 40;
  if (size >= 3) return 25;
  if (size >= 2) return 10;
  return 0;
}

// ── Main Cluster Detection ─────────────────────────────────

export interface ClusterReport {
  totalEdges: number;
  totalClusters: number;
  suspiciousClusters: ClusterInfo[];
  casesCreated: number;
  riskUpdates: number;
  timestamp: Date;
}

/**
 * Run full cluster detection across the advertiser graph.
 * Call nightly from cron.
 */
export async function runClusterDetection(): Promise<ClusterReport> {
  const startTime = Date.now();
  logInfo("[NetworkDetection] Starting cluster analysis...");

  // 1. Load all edges
  const edges = await AdvertiserEdge.find({})
    .select("userA userB signalType")
    .lean();

  if (edges.length === 0) {
    logInfo("[NetworkDetection] No edges found — nothing to analyse.");
    return {
      totalEdges: 0,
      totalClusters: 0,
      suspiciousClusters: [],
      casesCreated: 0,
      riskUpdates: 0,
      timestamp: new Date(),
    };
  }

  // 2. Build Union-Find
  const uf = new UnionFind();
  const edgesByCluster = new Map<string, { signalTypes: Set<string>; count: number }>();

  for (const edge of edges) {
    const a = String(edge.userA);
    const b = String(edge.userB);
    uf.union(a, b);
  }

  // 3. Extract clusters
  const clusters = uf.getClusters();

  // 4. Enrich with edge data
  for (const edge of edges) {
    const root = uf.find(String(edge.userA));
    if (!edgesByCluster.has(root)) {
      edgesByCluster.set(root, { signalTypes: new Set(), count: 0 });
    }
    const info = edgesByCluster.get(root)!;
    info.signalTypes.add(edge.signalType);
    info.count++;
  }

  // 5. Identify suspicious clusters (size ≥ 2)
  const suspiciousClusters: ClusterInfo[] = [];
  let casesCreated = 0;
  let riskUpdates = 0;

  for (const [root, members] of clusters) {
    if (members.length < 2) continue;

    const edgeInfo = edgesByCluster.get(root);
    const clusterId = `CLUSTER-${root.slice(-8)}`;

    const clusterInfo: ClusterInfo = {
      clusterId,
      members,
      size: members.length,
      edgeCount: edgeInfo?.count || 0,
      signalTypes: Array.from(edgeInfo?.signalTypes || []),
      riskAction: clusterRiskAction(members.length),
    };

    suspiciousClusters.push(clusterInfo);

    // Update edge cluster IDs
    const memberOids = members.map((m) => new mongoose.Types.ObjectId(m));
    await AdvertiserEdge.updateMany(
      {
        $or: [
          { userA: { $in: memberOids } },
          { userB: { $in: memberOids } },
        ],
      },
      { $set: { clusterId } }
    );

    // Apply risk points to all cluster members
    const points = clusterRiskPoints(members.length);
    if (points > 0) {
      for (const memberId of members) {
        await addRiskPoints(
          memberId,
          points,
          "NETWORK_CLUSTER_DETECTED",
          `Part of ${members.length}-account cluster ${clusterId}`
        );
        riskUpdates++;
      }
    }

    // Create investigation case for clusters ≥ 3
    if (members.length >= 3) {
      const existingCase = await InvestigationCase.findOne({ clusterId, status: { $nin: ["resolved", "closed"] } });
      if (!existingCase) {
        await InvestigationCase.create({
          type: members.length >= 6 ? "network_operation" : "scam_ring",
          priority: members.length >= 10 ? "critical" : members.length >= 6 ? "high" : "medium",
          title: `Network cluster detected: ${members.length} linked accounts`,
          description: `Cluster ${clusterId} contains ${members.length} accounts connected via: ${clusterInfo.signalTypes.join(", ")}. ${clusterInfo.edgeCount} connection(s) detected.`,
          relatedUsers: members.map((m) => new mongoose.Types.ObjectId(m)),
          clusterId,
        });
        casesCreated++;
        logWarn(`[NetworkDetection] Investigation case created for cluster ${clusterId} (${members.length} accounts)`);
      }
    }
  }

  // Log summary
  await AuditLog.log("PATTERN_DETECTED", {
    severity: suspiciousClusters.some((c) => c.size >= 6) ? "critical" : "warning",
    reason: "Network cluster analysis completed",
    metadata: {
      totalEdges: edges.length,
      totalClusters: suspiciousClusters.length,
      largestCluster: Math.max(...suspiciousClusters.map((c) => c.size), 0),
      casesCreated,
      durationMs: Date.now() - startTime,
    },
    isSystem: true,
  });

  logInfo(
    `[NetworkDetection] Complete: ${suspiciousClusters.length} clusters found, ${casesCreated} cases created, ${riskUpdates} risk updates (${Date.now() - startTime}ms)`
  );

  return {
    totalEdges: edges.length,
    totalClusters: suspiciousClusters.length,
    suspiciousClusters,
    casesCreated,
    riskUpdates,
    timestamp: new Date(),
  };
}

/**
 * Get the cluster a user belongs to (if any).
 */
export async function getUserCluster(
  userId: string
): Promise<{ clusterId: string; members: string[]; size: number } | null> {
  const edge = await AdvertiserEdge.findOne({
    $or: [
      { userA: new mongoose.Types.ObjectId(userId) },
      { userB: new mongoose.Types.ObjectId(userId) },
    ],
    clusterId: { $ne: null },
  }).lean();

  if (!edge || !edge.clusterId) return null;

  const clusterEdges = await AdvertiserEdge.find({ clusterId: edge.clusterId })
    .select("userA userB")
    .lean();

  const memberSet = new Set<string>();
  for (const e of clusterEdges) {
    memberSet.add(String(e.userA));
    memberSet.add(String(e.userB));
  }

  return {
    clusterId: edge.clusterId,
    members: Array.from(memberSet),
    size: memberSet.size,
  };
}

/**
 * Get network graph for a specific user (all edges involving them).
 */
export async function getUserNetworkGraph(userId: string): Promise<{
  nodes: { id: string; label?: string }[];
  edges: { from: string; to: string; type: string; strength: number }[];
}> {
  const allEdges = await AdvertiserEdge.find({
    $or: [
      { userA: new mongoose.Types.ObjectId(userId) },
      { userB: new mongoose.Types.ObjectId(userId) },
    ],
  }).lean();

  const nodeSet = new Set<string>();
  const graphEdges: { from: string; to: string; type: string; strength: number }[] = [];

  for (const edge of allEdges) {
    const a = String(edge.userA);
    const b = String(edge.userB);
    nodeSet.add(a);
    nodeSet.add(b);
    graphEdges.push({
      from: a,
      to: b,
      type: edge.signalType,
      strength: edge.strength,
    });
  }

  return {
    nodes: Array.from(nodeSet).map((id) => ({ id })),
    edges: graphEdges,
  };
}
