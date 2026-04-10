import { Router } from "express";
import Ad from "../../models/Ad";
import User from "../../models/User";
import Report from "../../models/Report";
import AdminLog from "../../models/AdminLog";
import GeoCache from "../../models/GeoCache";
import { getHealthMetrics, getAllMetrics, getRecentSlowQueries } from "../../services/observabilityService";
import { getBucketStats } from "../../services/rankingService";
import logger from "../../utils/logger";

const router = Router();

// GET /api/admin/stats
router.get("/", async (req, res) => {
  try {
    // Start of today (midnight UTC)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalAds,
      approvedAds,
      pendingAds,
      rejectedAds,
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalReports,
      pendingReports,
      todaySignups,
      todayAds,
      recentLogs,
    ] = await Promise.all([
      Ad.countDocuments({ isDeleted: { $ne: true } }),
      Ad.countDocuments({ status: "approved", isDeleted: { $ne: true } }),
      Ad.countDocuments({ status: "pending", isDeleted: { $ne: true } }),
      Ad.countDocuments({ status: "rejected", isDeleted: { $ne: true } }),
      User.countDocuments({ deleted: { $ne: true } }),
      User.countDocuments({ status: "active", deleted: { $ne: true } }),
      User.countDocuments({ status: "suspended", deleted: { $ne: true } }),
      Report.countDocuments({}),
      Report.countDocuments({ status: "pending" }),
      User.countDocuments({ createdAt: { $gte: todayStart }, deleted: { $ne: true } }),
      Ad.countDocuments({ createdAt: { $gte: todayStart }, isDeleted: { $ne: true } }),
      AdminLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.json({
      ads: {
        total: totalAds,
        approved: approvedAds,
        pending: pendingAds,
        rejected: rejectedAds,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
      },
      today: {
        signups: todaySignups,
        ads: todayAds,
      },
      recentActivity: recentLogs,
    });
  } catch (err) {
    logger.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/admin/stats/geo-health - Geo data health metrics
router.get("/geo-health", async (req, res) => {
  try {
    const baseFilter = { isDeleted: { $ne: true }, status: "approved" };

    const [
      totalAds,
      adsWithPostcode,
      adsWithOutcode,
      adsWithGeo,
      adsWithGeoMissingPostcode,
      adsMissingGeoWithPostcode,
      adsMissingGeoWithOutcode,
      geoCacheCount,
      geoCacheByType,
      recentGeocodes,
    ] = await Promise.all([
      // Total approved ads
      Ad.countDocuments(baseFilter),

      // Ads that have a postcode stored
      Ad.countDocuments({ ...baseFilter, postcode: { $exists: true, $nin: [null, ""] } }),

      // Ads that have an outcode stored
      Ad.countDocuments({ ...baseFilter, outcode: { $exists: true, $nin: [null, ""] } }),

      // Ads that have geo coordinates
      Ad.countDocuments({ ...baseFilter, "geo.coordinates": { $exists: true } }),

      // Ads with geo but no postcode (edge case)
      Ad.countDocuments({
        ...baseFilter,
        "geo.coordinates": { $exists: true },
        $or: [
          { postcode: { $exists: false } },
          { postcode: null },
          { postcode: "" },
        ],
      }),

      // Ads missing geo but have postcode (need backfill)
      Ad.countDocuments({
        ...baseFilter,
        $or: [
          { geo: { $exists: false } },
          { "geo.coordinates": { $exists: false } },
        ],
        postcode: { $exists: true, $nin: [null, ""] },
      }),

      // Ads missing geo but have outcode (need backfill)
      Ad.countDocuments({
        ...baseFilter,
        $or: [
          { geo: { $exists: false } },
          { "geo.coordinates": { $exists: false } },
        ],
        outcode: { $exists: true, $nin: [null, ""] },
      }),

      // Total cached geocode entries
      GeoCache.countDocuments({}),

      // Cache breakdown by type
      GeoCache.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),

      // Most recent geocode cache entries
      GeoCache.find({})
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("key keyType outcode district updatedAt"),
    ]);

    // Convert cache type breakdown to object
    const cacheByType: Record<string, number> = {};
    for (const item of geoCacheByType) {
      cacheByType[item._id || "unknown"] = item.count;
    }

    // Calculate coverage percentages
    const geoPercentage = totalAds > 0 ? Math.round((adsWithGeo / totalAds) * 100) : 0;
    const postcodePercentage = totalAds > 0 ? Math.round((adsWithPostcode / totalAds) * 100) : 0;
    const outcodePercentage = totalAds > 0 ? Math.round((adsWithOutcode / totalAds) * 100) : 0;

    res.json({
      summary: {
        totalAds,
        geoPercentage,
        postcodePercentage,
        outcodePercentage,
        needsBackfill: adsMissingGeoWithPostcode + adsMissingGeoWithOutcode,
      },
      ads: {
        total: totalAds,
        withPostcode: adsWithPostcode,
        withOutcode: adsWithOutcode,
        withGeo: adsWithGeo,
        withGeoMissingPostcode: adsWithGeoMissingPostcode,
        missingGeoWithPostcode: adsMissingGeoWithPostcode,
        missingGeoWithOutcode: adsMissingGeoWithOutcode,
      },
      cache: {
        total: geoCacheCount,
        byType: cacheByType,
        recentEntries: recentGeocodes,
      },
      health: {
        status: geoPercentage >= 80 ? "good" : geoPercentage >= 50 ? "warning" : "critical",
        message:
          geoPercentage >= 80
            ? "Geo coverage is healthy"
            : geoPercentage >= 50
              ? "Some ads need geo backfill"
              : "Many ads missing geo data - run backfill script",
      },
    });
  } catch (err) {
    logger.error("Geo health error:", err);
    res.status(500).json({ error: "Failed to fetch geo health stats" });
  }
});

// GET /api/admin/stats/observability - System health and metrics
router.get("/observability", async (req, res) => {
  try {
    const [healthMetrics, allMetrics, bucketStats, slowQueries] = await Promise.all([
      getHealthMetrics(),
      getAllMetrics(),
      getBucketStats(),
      Promise.resolve(getRecentSlowQueries()),
    ]);

    res.json({
      health: healthMetrics,
      metrics: allMetrics,
      buckets: bucketStats,
      slowQueries: slowQueries.slice(0, 20), // Last 20 slow queries
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("Observability error:", err);
    res.status(500).json({ error: "Failed to fetch observability data" });
  }
});

export default router;
