import { Router } from "express";
import AdminLog from "../../models/AdminLog";
import logger from "../../utils/logger";

const router = Router();

/**
 * GET /api/admin/logs
 * Fetch admin action logs with pagination and filtering
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
    const skip = (page - 1) * limit;

    const { action, targetType, adminId } = req.query;

    const filter: any = {};
    if (action) filter.action = String(action);
    if (targetType) filter.targetType = String(targetType);
    if (adminId) filter.adminId = String(adminId);

    const [total, logs] = await Promise.all([
      AdminLog.countDocuments(filter),
      AdminLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      logs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error("Admin logs error:", err);
    res.status(500).json({ error: "Failed to fetch admin logs" });
  }
});

/**
 * GET /api/admin/logs/recent
 * Get the 50 most recent admin actions (for dashboard widget)
 */
router.get("/recent", async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ logs });
  } catch (err) {
    logger.error("Recent admin logs error:", err);
    res.status(500).json({ error: "Failed to fetch recent logs" });
  }
});

export default router;
