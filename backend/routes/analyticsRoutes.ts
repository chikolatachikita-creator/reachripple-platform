import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import ProfileView from "../models/ProfileView";
import Ad from "../models/Ad";
import auth from "../middleware/auth";
import { AuthRequest } from "../middleware/auth";
import logger from "../utils/logger";

const router = Router();

// ── Rate-limit view tracking (prevent spam) ────────────────────
const viewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 view events per minute per IP
  keyGenerator: (req) => req.ip || "unknown",
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests" });
  },
});

// ── POST /api/analytics/view — record a profile view ──────────
router.post("/view", viewLimiter, async (req: Request, res: Response) => {
  try {
    const { adId } = req.body;
    if (!adId || !mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: "Invalid adId" });
    }

    const ad = await Ad.findById(adId).select("userId").lean();
    if (!ad || !ad.userId) {
      return res.status(404).json({ error: "Ad not found" });
    }

    const viewerIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";

    // Dedup: skip if same IP viewed this ad in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await ProfileView.findOne({
      adId,
      viewerIp,
      createdAt: { $gte: oneHourAgo },
    }).lean();

    if (recent) {
      return res.json({ recorded: false, reason: "duplicate" });
    }

    await ProfileView.create({
      adId,
      advertiserId: ad.userId,
      viewerIp,
      referrer: (req.headers.referer || "").slice(0, 500),
      userAgent: (req.headers["user-agent"] || "").slice(0, 500),
    });

    // Also increment the inline views counter on the ad
    await Ad.updateOne({ _id: adId }, { $inc: { views: 1 } });

    return res.json({ recorded: true });
  } catch (err) {
    logger.error("Analytics view error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/analytics/dashboard — advertiser analytics ───────
router.get("/dashboard", auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch advertiser's ads
    const ads = await Ad.find({ userId, isDeleted: { $ne: true } })
      .select("_id title images views status createdAt")
      .lean();

    const adIds = ads.map((a) => a._id);

    // Total views (all time)
    const totalViews = await ProfileView.countDocuments({ advertiserId: userId });

    // Views last 30 days
    const views30d = await ProfileView.countDocuments({
      advertiserId: userId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Views last 7 days
    const views7d = await ProfileView.countDocuments({
      advertiserId: userId,
      createdAt: { $gte: sevenDaysAgo },
    });

    // Daily views for chart (last 30 days)
    const dailyViews = await ProfileView.aggregate([
      {
        $match: {
          advertiserId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top ads by views (last 30 days)
    const topAds = await ProfileView.aggregate([
      {
        $match: {
          advertiserId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: "$adId", views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "ads",
          localField: "_id",
          foreignField: "_id",
          as: "ad",
        },
      },
      { $unwind: "$ad" },
      {
        $project: {
          _id: 1,
          views: 1,
          title: "$ad.title",
          image: { $arrayElemAt: ["$ad.images", 0] },
        },
      },
    ]);

    // Top referrers
    const topReferrers = await ProfileView.aggregate([
      {
        $match: {
          advertiserId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: thirtyDaysAgo },
          referrer: { $ne: "" },
        },
      },
      { $group: { _id: "$referrer", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return res.json({
      totalViews,
      views30d,
      views7d,
      dailyViews: dailyViews.map((d) => ({ date: d._id, views: d.count })),
      topAds,
      topReferrers: topReferrers.map((r) => ({ source: r._id, views: r.count })),
      activeAds: ads.filter((a) => a.status === "approved").length,
      totalAds: ads.length,
    });
  } catch (err) {
    logger.error("Analytics dashboard error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/analytics/export — CSV export of analytics data ──
router.get("/export", auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const views = await ProfileView.aggregate([
      {
        $match: {
          advertiserId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: since },
        },
      },
      {
        $lookup: {
          from: "ads",
          localField: "adId",
          foreignField: "_id",
          as: "ad",
        },
      },
      { $unwind: { path: "$ad", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$createdAt" } },
          adTitle: { $ifNull: ["$ad.title", "Deleted Ad"] },
          referrer: { $ifNull: ["$referrer", ""] },
        },
      },
      { $sort: { date: -1 } },
    ]);

    const header = "Date,Ad Title,Referrer\n";
    const rows = views.map((v: any) => {
      const title = String(v.adTitle).replace(/"/g, '""');
      const ref = String(v.referrer).replace(/"/g, '""');
      return `${v.date},"${title}","${ref}"`;
    }).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=analytics-${days}d.csv`);
    return res.send(header + rows);
  } catch (err) {
    logger.error("Analytics CSV export error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
