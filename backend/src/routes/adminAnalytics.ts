import { Router } from "express";
import Ad from "../../models/Ad";
import User from "../../models/User";
import Report from "../../models/Report";
import AdminLog from "../../models/AdminLog";
import logger from "../../utils/logger";

const router = Router();

/**
 * GET /api/admin/analytics
 * Returns daily aggregated data for the past N days (default 30)
 * Used by the Admin Analytics page for charts and trends
 */
router.get("/", async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Daily signups aggregation
    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Daily ads posted
    const dailyAds = await Ad.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Daily reports filed
    const dailyReports = await Report.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Ads by status breakdown
    const adsByStatus = await Ad.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Ads by tier breakdown
    const adsByTier = await Ad.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: "$tier",
          count: { $sum: 1 },
        },
      },
    ]);

    // Users by status
    const usersByStatus = await User.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Users by type (independent vs agency)
    const usersByType = await User.aggregate([
      {
        $group: {
          _id: "$accountType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Reports by status
    const reportsByStatus = await Report.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Admin activity summary (last 30 days, grouped by action type)
    const adminActivity = await AdminLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Fill in missing dates with 0 counts
    const fillDates = (data: { _id: string; count: number }[]) => {
      const map = new Map(data.map((d) => [d._id, d.count]));
      const result: { date: string; count: number }[] = [];
      const current = new Date(startDate);
      const now = new Date();
      while (current <= now) {
        const key = current.toISOString().slice(0, 10);
        result.push({ date: key, count: map.get(key) || 0 });
        current.setDate(current.getDate() + 1);
      }
      return result;
    };

    // Helper to convert aggregation to object
    const toObject = (data: { _id: string; count: number }[]) => {
      const result: Record<string, number> = {};
      for (const item of data) {
        result[item._id || "unknown"] = item.count;
      }
      return result;
    };

    res.json({
      period: { days, startDate: startDate.toISOString() },
      daily: {
        signups: fillDates(dailySignups),
        ads: fillDates(dailyAds),
        reports: fillDates(dailyReports),
      },
      breakdowns: {
        adsByStatus: toObject(adsByStatus),
        adsByTier: toObject(adsByTier),
        usersByStatus: toObject(usersByStatus),
        usersByType: toObject(usersByType),
        reportsByStatus: toObject(reportsByStatus),
      },
      adminActivity: toObject(adminActivity),
    });
  } catch (err: any) {
    logger.error("Admin analytics error:", err);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
