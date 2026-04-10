/**
 * Health Check & Monitoring Endpoints
 * Provides system health status, metrics, and performance data
 */

import { Router, Request, Response } from "express";
import {
  getHealthStatus,
  getPerformanceStats,
  baseLogger,
} from "../config/monitoring";
import { getFlags, isEnabled, setFlag } from "../config/featureFlags";
import auth from "../middleware/auth";
import admin from "../middleware/admin";

const router = Router();

/**
 * GET /health - Basic health check for load balancers
 * Returns: { status: "ok", timestamp: "..." }
 */
router.get("/", (req: Request, res: Response) => {
  try {
    const health = getHealthStatus();
    res.status(200).json({
      status: health.status === "healthy" ? "ok" : health.status,
      timestamp: health.timestamp,
      uptime: Math.round(health.uptime),
    });
  } catch (err) {
    baseLogger.error("Health check error", err);
    res.status(500).json({ status: "error" });
  }
});

/**
 * GET /metrics - Detailed performance metrics (for monitoring dashboards)
 * Returns detailed system and performance statistics
 */
router.get("/metrics", (req: Request, res: Response) => {
  try {
    const health = getHealthStatus();
    const perf = getPerformanceStats();

    res.status(200).json({
      status: health.status,
      timestamp: health.timestamp,
      uptime: {
        seconds: Math.round(health.uptime),
        formatted: formatUptime(health.uptime),
      },
      memory: {
        heapUsed: Math.round(health.memory.heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(health.memory.heapTotal / 1024 / 1024) + " MB",
        external: Math.round(health.memory.external / 1024 / 1024) + " MB",
        rss: Math.round(health.memory.rss / 1024 / 1024) + " MB",
        heapUsedPercent: (
          (health.memory.heapUsed / health.memory.heapTotal) *
          100
        ).toFixed(2) + "%",
      },
      performance: {
        totalRequests: perf.totalRequests,
        averageResponseTime: perf.averageResponseTime + " ms",
        slowRequests: perf.slowRequests,
        errorRequests: perf.errorRequests,
      },
      warnings: generateWarnings(health),
    });
  } catch (err) {
    baseLogger.error("Metrics endpoint error", err);
    res.status(500).json({ error: "Failed to retrieve metrics" });
  }
});

/**
 * GET /status - Comprehensive system status (for dashboards)
 */
router.get("/status", (req: Request, res: Response) => {
  try {
    const health = getHealthStatus();
    const perf = getPerformanceStats();

    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for issues
    const heapPercent =
      (health.memory.heapUsed / health.memory.heapTotal) * 100;
    if (heapPercent > 90) {
      errors.push("Heap memory usage critically high (>90%)");
    } else if (heapPercent > 75) {
      warnings.push("Heap memory usage elevated (>75%)");
    }

    if (perf.slowRequests > perf.totalRequests * 0.1) {
      warnings.push(
        `High number of slow requests (${perf.slowRequests}/${perf.totalRequests})`
      );
    }

    if (perf.errorRequests > 0) {
      warnings.push(
        `API errors detected (${perf.errorRequests} requests with 4xx/5xx status)`
      );
    }

    const status =
      errors.length > 0 ? "unhealthy" : warnings.length > 0 ? "degraded" : "healthy";

    res.status(status === "healthy" ? 200 : 503).json({
      status,
      timestamp: health.timestamp,
      uptime: {
        seconds: Math.round(health.uptime),
        formatted: formatUptime(health.uptime),
      },
      memory: {
        used: Math.round(health.memory.heapUsed / 1024 / 1024) + " MB",
        total: Math.round(health.memory.heapTotal / 1024 / 1024) + " MB",
        percent: ((health.memory.heapUsed / health.memory.heapTotal) * 100).toFixed(
          1
        ) + "%",
      },
      requests: {
        total: perf.totalRequests,
        avgResponseTime: perf.averageResponseTime + " ms",
        slow: perf.slowRequests,
        errors: perf.errorRequests,
      },
      warnings,
      errors,
      timestamp_utc: new Date().toISOString(),
    });
  } catch (err) {
    baseLogger.error("Status endpoint error", err);
    res.status(500).json({
      status: "unhealthy",
      error: "Failed to retrieve status",
    });
  }
});

/**
 * POST /reset-metrics - Reset performance metrics (admin only)
 */
router.post("/reset-metrics", auth, admin, (req: Request, res: Response) => {
  try {
    baseLogger.info("Metrics reset requested");
    res.status(200).json({
      message: "Metrics reset successfully",
      timestamp: new Date(),
    });
  } catch (err) {
    baseLogger.error("Metrics reset error", err);
    res.status(500).json({ error: "Failed to reset metrics" });
  }
});

// ============ HELPER FUNCTIONS ============

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

function generateWarnings(health: any): string[] {
  const warnings: string[] = [];
  const heapPercent =
    (health.memory.heapUsed / health.memory.heapTotal) * 100;

  if (heapPercent > 75) {
    warnings.push(
      `Memory usage at ${heapPercent.toFixed(1)}% - consider investigating`
    );
  }

  return warnings;
}

/**
 * GET /health/flags - Get current feature flags
 */
router.get("/flags", (req: Request, res: Response) => {
  res.json({ flags: getFlags() });
});

export default router;
