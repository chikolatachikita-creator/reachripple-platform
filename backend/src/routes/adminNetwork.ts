/**
 * Admin Network & Investigation Routes
 *
 * Routes for managing advertiser networks, investigation cases,
 * and viewing the connection graph.
 *
 * Routes:
 *   GET   /api/admin/network/clusters        - List detected clusters
 *   GET   /api/admin/network/user/:userId     - Get user's network graph
 *   GET   /api/admin/network/signals/:userId  - Get user's signals + scam score
 *   POST  /api/admin/network/scan             - Trigger cluster detection scan
 *   GET   /api/admin/network/cases            - List investigation cases
 *   GET   /api/admin/network/cases/:id        - Get case details
 *   PATCH /api/admin/network/cases/:id        - Update case (status, notes, assignment)
 *   POST  /api/admin/network/cases            - Create investigation case manually
 *   GET   /api/admin/network/stats            - Network stats overview
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import AdvertiserSignal from "../../models/AdvertiserSignal";
import AdvertiserEdge from "../../models/AdvertiserEdge";
import InvestigationCase from "../../models/InvestigationCase";
import User from "../../models/User";
import { RiskProfile } from "../../models/RiskProfile";
import { runClusterDetection, getUserNetworkGraph, getUserCluster } from "../../services/networkDetectionService";
import { analyseAdvertiserScam } from "../../services/scamDetectionService";
import { AuditLog } from "../../models/AuditLog";
import logger from "../../utils/logger";

const router = Router();

// ── GET /clusters — List detected clusters ─────────────────

router.get("/clusters", async (_req: Request, res: Response) => {
  try {
    // Get unique cluster IDs and their sizes
    const clusters = await AdvertiserEdge.aggregate([
      { $match: { clusterId: { $ne: null } } },
      {
        $group: {
          _id: "$clusterId",
          members: { $addToSet: "$userA" },
          membersB: { $addToSet: "$userB" },
          signalTypes: { $addToSet: "$signalType" },
          edgeCount: { $sum: 1 },
          lastSeen: { $max: "$lastSeenAt" },
        },
      },
      { $sort: { edgeCount: -1 } },
      { $limit: 50 },
    ]);

    // Merge memberA and memberB sets
    const enriched = clusters.map((c: any) => {
      const allMembers = new Set<string>();
      (c.members || []).forEach((m: any) => allMembers.add(String(m)));
      (c.membersB || []).forEach((m: any) => allMembers.add(String(m)));
      return {
        clusterId: c._id,
        size: allMembers.size,
        signalTypes: c.signalTypes,
        edgeCount: c.edgeCount,
        lastSeen: c.lastSeen,
        memberIds: Array.from(allMembers),
      };
    });

    return res.json({ clusters: enriched });
  } catch (err: any) {
    logger.error("Admin clusters error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /user/:userId — Network graph for a user ───────────

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const [graph, cluster, signal, riskProfile] = await Promise.all([
      getUserNetworkGraph(userId),
      getUserCluster(userId),
      AdvertiserSignal.findOne({ userId }).lean(),
      RiskProfile.findOne({ userId }).lean(),
    ]);

    // Enrich nodes with user info
    const userIds = graph.nodes.map((n) => n.id);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email phone createdAt status")
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const enrichedNodes = graph.nodes.map((n) => ({
      ...n,
      user: userMap.get(n.id) || null,
    }));

    return res.json({
      graph: { nodes: enrichedNodes, edges: graph.edges },
      cluster,
      signal: signal
        ? {
            scamScore: signal.scamScore,
            phoneNumbers: signal.phoneNumbers.length,
            ipAddresses: signal.ipAddresses.length,
            deviceFingerprints: signal.deviceFingerprints.length,
            imageHashes: signal.imageHashes.length,
            citiesPosted: signal.citiesPosted,
          }
        : null,
      riskProfile: riskProfile
        ? {
            riskScore: riskProfile.riskScore,
            riskLevel: riskProfile.riskLevel,
            isUnderReview: riskProfile.isUnderReview,
          }
        : null,
    });
  } catch (err: any) {
    logger.error("Admin user network error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /signals/:userId — User's advertiser signals ───────

router.get("/signals/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const signal = await AdvertiserSignal.findOne({ userId }).lean();
    if (!signal) {
      return res.json({ signal: null });
    }

    return res.json({ signal });
  } catch (err: any) {
    logger.error("Admin signals error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── POST /scan — Trigger cluster detection ─────────────────

router.post("/scan", async (_req: Request, res: Response) => {
  try {
    const report = await runClusterDetection();
    return res.json({ report });
  } catch (err: any) {
    logger.error("Admin network scan error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /cases — List investigation cases ──────────────────

router.get("/cases", async (req: Request, res: Response) => {
  try {
    const { status, priority, page = "1", limit = "20" } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));

    const [cases, total] = await Promise.all([
      InvestigationCase.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(String(limit)))
        .populate("relatedUsers", "name email")
        .populate("assignedTo", "name email")
        .lean(),
      InvestigationCase.countDocuments(filter),
    ]);

    return res.json({ cases, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
  } catch (err: any) {
    logger.error("Admin cases list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /cases/:id — Get case details ──────────────────────

router.get("/cases/:id", async (req: Request, res: Response) => {
  try {
    const caseDoc = await InvestigationCase.findById(req.params.id)
      .populate("relatedUsers", "name email phone createdAt status")
      .populate("relatedAds", "title status moderationStatus images")
      .populate("relatedReports", "reason description status")
      .populate("assignedTo", "name email")
      .populate("notes.author", "name email")
      .lean();

    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found" });
    }

    return res.json({ case: caseDoc });
  } catch (err: any) {
    logger.error("Admin case detail error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH /cases/:id — Update case ─────────────────────────

router.patch("/cases/:id", async (req: Request, res: Response) => {
  try {
    const { status, priority, assignedTo, note, resolution, actionsTaken } = req.body;
    const adminId = (req as any).userId;

    const caseDoc = await InvestigationCase.findById(req.params.id);
    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found" });
    }

    if (status) caseDoc.status = status;
    if (priority) caseDoc.priority = priority;
    if (assignedTo) caseDoc.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    if (resolution) caseDoc.resolution = resolution;
    if (actionsTaken) caseDoc.actionsTaken = actionsTaken;

    if (status === "resolved" || status === "closed") {
      caseDoc.resolvedAt = new Date();
    }

    if (note) {
      caseDoc.notes.push({
        author: new mongoose.Types.ObjectId(adminId),
        text: note,
        createdAt: new Date(),
      });
    }

    await caseDoc.save();

    // Audit log
    await AuditLog.log("MANUAL_OVERRIDE", {
      adminId: new mongoose.Types.ObjectId(adminId),
      isSystem: false,
      severity: "info",
      reason: `Investigation case ${caseDoc.caseNumber} updated: ${status || "note added"}`,
      metadata: { caseId: caseDoc._id, status, priority, note: note ? "(note added)" : undefined },
    });

    return res.json({ case: caseDoc });
  } catch (err: any) {
    logger.error("Admin case update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── POST /cases — Create case manually ─────────────────────

router.post("/cases", async (req: Request, res: Response) => {
  try {
    const { type, priority, title, description, relatedUsers, relatedAds, relatedReports } = req.body;
    const adminId = (req as any).userId;

    if (!type || !title) {
      return res.status(400).json({ error: "type and title are required" });
    }

    const newCase = await InvestigationCase.create({
      type,
      priority: priority || "medium",
      title,
      description: description || "",
      relatedUsers: relatedUsers || [],
      relatedAds: relatedAds || [],
      relatedReports: relatedReports || [],
      notes: [
        {
          author: new mongoose.Types.ObjectId(adminId),
          text: "Case created manually by admin",
          createdAt: new Date(),
        },
      ],
    });

    await AuditLog.log("MANUAL_OVERRIDE", {
      adminId: new mongoose.Types.ObjectId(adminId),
      isSystem: false,
      severity: "warning",
      reason: `Manual investigation case created: ${newCase.caseNumber}`,
      metadata: { caseId: newCase._id, type, priority },
    });

    return res.status(201).json({ case: newCase });
  } catch (err: any) {
    logger.error("Admin case create error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /stats — Network stats overview ────────────────────

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [
      totalEdges,
      totalSignals,
      openCases,
      criticalCases,
      highScamUsers,
      clusterData,
    ] = await Promise.all([
      AdvertiserEdge.countDocuments(),
      AdvertiserSignal.countDocuments(),
      InvestigationCase.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      InvestigationCase.countDocuments({ priority: "critical", status: { $nin: ["resolved", "closed"] } }),
      AdvertiserSignal.countDocuments({ scamScore: { $gte: 60 } }),
      AdvertiserEdge.aggregate([
        { $match: { clusterId: { $ne: null } } },
        { $group: { _id: "$clusterId" } },
        { $count: "total" },
      ]),
    ]);

    const totalClusters = clusterData[0]?.total || 0;

    // Signal type distribution
    const signalDist = await AdvertiserEdge.aggregate([
      { $group: { _id: "$signalType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return res.json({
      totalEdges,
      totalSignals,
      totalClusters,
      openCases,
      criticalCases,
      highScamUsers,
      signalDistribution: signalDist.map((s: any) => ({ type: s._id, count: s.count })),
    });
  } catch (err: any) {
    logger.error("Admin network stats error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
