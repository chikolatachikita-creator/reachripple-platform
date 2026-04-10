/**
 * Monitoring & Logging Configuration
 * Centralized setup for error tracking, performance monitoring, and logging
 */

import winston from "winston";
import path from "path";
import fs from "fs";

// ============ WINSTON LOGGER SETUP ============

const logsDir = path.join(__dirname, "..", "..", "logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create base logger using winston
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "escort-platform-api" },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "app.log"),
    }),
  ],
});

// Add console output in development
if (process.env.NODE_ENV !== "production") {
  baseLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// ============ OPTIONAL SENTRY ERROR TRACKING SETUP ============

const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    baseLogger.warn(
      "⚠️ SENTRY_DSN not configured. Error tracking disabled. Set SENTRY_DSN=https://... to enable."
    );
    return;
  }

  try {
    const Sentry = require("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === "development",
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      // Ignore certain errors
      ignoreErrors: [
        "AbortError",
        "NotAllowedError",
        "NotFoundError",
        "NotSupportedError",
        "InvalidStateError",
        "timeout of",
        "NetworkError",
        "Network request failed",
      ],
    });

    baseLogger.info(
      "✅ Sentry initialized for error tracking (environment: " +
        (process.env.NODE_ENV || "development") +
        ")"
    );
  } catch (err) {
    baseLogger.warn(
      "⚠️ Sentry not available (@sentry/node not installed). Error tracking disabled."
    );
  }
};

// ============ PERFORMANCE MONITORING ============

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: Date;
  statusCode: number;
}

const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000; // Keep last 1000 requests

const recordMetric = (
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number
) => {
  performanceMetrics.push({
    endpoint,
    method,
    duration,
    statusCode,
    timestamp: new Date(),
  });

  // Keep only recent metrics
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.splice(0, performanceMetrics.length - MAX_METRICS);
  }

  // Log slow requests
  if (duration > 1000) {
    baseLogger.warn("🐌 Slow request detected", {
      endpoint,
      method,
      duration,
      statusCode,
    });
  }
};

const getPerformanceStats = () => {
  if (performanceMetrics.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRequests: 0,
    };
  }

  const totalRequests = performanceMetrics.length;
  const averageResponseTime =
    performanceMetrics.reduce((sum, m) => sum + m.duration, 0) /
    totalRequests;
  const slowRequests = performanceMetrics.filter((m) => m.duration > 1000)
    .length;
  const errorRequests = performanceMetrics.filter((m) => m.statusCode >= 400)
    .length;

  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime),
    slowRequests,
    errorRequests,
  };
};

// ============ HEALTH CHECK ============

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  performance: ReturnType<typeof getPerformanceStats>;
}

const getHealthStatus = (): HealthStatus => {
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  return {
    status:
      heapUsedPercent > 90
        ? "unhealthy"
        : heapUsedPercent > 75
          ? "degraded"
          : "healthy",
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: memUsage,
    performance: getPerformanceStats(),
  };
};

// ============ MIDDLEWARE FUNCTIONS ============

/**
 * Express middleware for logging all requests
 */
const requestLoggingMiddleware = (
  req: any,
  res: any,
  next: any
) => {
  const startTime = Date.now();

  // Capture response
  const originalJson = res.json;
  res.json = function (data: any) {
    const duration = Date.now() - startTime;
    recordMetric(req.path, req.method, duration, res.statusCode);

    baseLogger.info("API Request", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration + "ms",
      ip: req.ip,
    });

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Express middleware for optional Sentry error tracking
 */
const sentryErrorHandler = () => {
  try {
    const Sentry = require("@sentry/node");
    return Sentry.Handlers.errorHandler();
  } catch (err) {
    // Sentry not available, return no-op middleware
    return (err: any, req: any, res: any, next: any) => {
      next();
    };
  }
};

/**
 * Global error handler with logging
 */
const globalErrorHandler = (err: any, req: any, res: any, next: any) => {
  const errorId = `ERROR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  baseLogger.error("Unhandled error", {
    errorId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Send error to Sentry (if available)
  try {
    const Sentry = require("@sentry/node");
    Sentry.captureException(err, {
      tags: {
        errorId,
        path: req.path,
        method: req.method,
      },
    });
  } catch (sentryErr) {
    // Sentry not available, silently skip
  }

  res.status(500).json({
    error: "Internal server error",
    errorId,
    ...(process.env.NODE_ENV === "development" && { message: err.message }),
  });
};

/**
 * Graceful shutdown with cleanup
 */
const setupGracefulShutdown = (server: any) => {
  const signals = ["SIGTERM", "SIGINT"];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      baseLogger.info(`📍 Received ${signal}, gracefully shutting down...`);

      // Log final health status
      const healthStatus = getHealthStatus();
      baseLogger.info("Final health check before shutdown", healthStatus);

      server.close(() => {
        baseLogger.info("Server closed");
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        baseLogger.error("Forced shutdown after 10 seconds");
        process.exit(1);
      }, 10000);
    });
  });
};

export {
  baseLogger,
  initSentry,
  requestLoggingMiddleware,
  sentryErrorHandler,
  globalErrorHandler,
  setupGracefulShutdown,
  getHealthStatus,
  recordMetric,
  getPerformanceStats,
};
