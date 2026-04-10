/**
 * Observability Service
 * 
 * Metrics tracking, slow query logging, and monitoring:
 * - Log slow queries (>300ms)
 * - Track searches/minute
 * - Track empty result rate
 * - Track post abandon rate
 * - Real-time metrics for debugging
 */

import { logInfo, logWarn, logError, logDebug } from "../utils/logger";
import { getRedis } from "./cacheService";

// ============================================
// CONFIGURATION
// ============================================

const SLOW_QUERY_THRESHOLD_MS = 300; // Log queries slower than this
const METRICS_WINDOW_SECONDS = 60; // 1 minute window for rate metrics
const METRICS_RETENTION_SECONDS = 60 * 60; // Keep metrics for 1 hour

// ============================================
// QUERY TIMING
// ============================================

interface QueryTiming {
  operation: string;
  collection: string;
  durationMs: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const recentSlowQueries: QueryTiming[] = [];
const MAX_SLOW_QUERY_HISTORY = 100;

/**
 * Log and track slow queries
 */
export function logSlowQuery(timing: QueryTiming): void {
  if (timing.durationMs >= SLOW_QUERY_THRESHOLD_MS) {
    logWarn(`Slow query detected: ${timing.operation}`, {
      collection: timing.collection,
      durationMs: timing.durationMs,
      ...timing.metadata,
    });

    // Keep in-memory history (for debugging)
    recentSlowQueries.unshift({
      ...timing,
      timestamp: new Date(),
    });
    
    // Trim to max size
    if (recentSlowQueries.length > MAX_SLOW_QUERY_HISTORY) {
      recentSlowQueries.pop();
    }

    // Increment Redis counter for slow queries
    incrementMetric("slow_queries").catch(() => {});
  }
}

/**
 * Create a timer for measuring query duration
 */
export function startQueryTimer(operation: string, collection: string) {
  const startTime = Date.now();
  
  return {
    end: (metadata?: Record<string, any>) => {
      const durationMs = Date.now() - startTime;
      
      logSlowQuery({
        operation,
        collection,
        durationMs,
        timestamp: new Date(),
        metadata,
      });

      return durationMs;
    },
  };
}

/**
 * Get recent slow queries (for debugging endpoint)
 */
export function getRecentSlowQueries(): QueryTiming[] {
  return recentSlowQueries.slice(0, 50);
}

// ============================================
// REDIS-BASED METRICS
// ============================================

type MetricName = 
  | "searches"
  | "search_empty"
  | "search_errors"
  | "ad_views"
  | "ad_clicks"
  | "ad_creates"
  | "ad_create_errors"
  | "location_lookups"
  | "slow_queries"
  | "auth_attempts"
  | "auth_failures"
  | "post_starts"
  | "post_completes"
  | "post_abandons";

/**
 * Increment a metric counter (stored in Redis)
 */
export async function incrementMetric(
  metric: MetricName,
  amount: number = 1
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      // Fallback: just log if Redis unavailable
      logDebug(`Metric (no Redis): ${metric} +${amount}`);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const windowKey = `metrics:${metric}:${now}`;
    
    await redis.multi()
      .incrby(windowKey, amount)
      .expire(windowKey, METRICS_RETENTION_SECONDS)
      .exec();
  } catch (err) {
    // Don't fail operations due to metrics
    logDebug(`Metrics error: ${err}`);
  }
}

/**
 * Get metric count for the last N seconds
 */
export async function getMetricRate(
  metric: MetricName,
  windowSeconds: number = METRICS_WINDOW_SECONDS
): Promise<number> {
  try {
    const redis = getRedis();
    if (!redis) return 0;

    const now = Math.floor(Date.now() / 1000);
    const keys: string[] = [];
    
    for (let i = 0; i < windowSeconds; i++) {
      keys.push(`metrics:${metric}:${now - i}`);
    }

    const values = await redis.mget(...keys);
    return values.reduce((sum, val) => sum + (parseInt(val || "0", 10) || 0), 0);
  } catch (err) {
    logDebug(`Metrics read error: ${err}`);
    return 0;
  }
}

/**
 * Get all current metrics rates
 */
export async function getAllMetrics(): Promise<Record<MetricName, number>> {
  const metrics: MetricName[] = [
    "searches",
    "search_empty",
    "search_errors",
    "ad_views",
    "ad_clicks",
    "ad_creates",
    "ad_create_errors",
    "location_lookups",
    "slow_queries",
    "auth_attempts",
    "auth_failures",
    "post_starts",
    "post_completes",
    "post_abandons",
  ];

  const rates: Record<string, number> = {};
  
  await Promise.all(
    metrics.map(async (metric) => {
      rates[metric] = await getMetricRate(metric);
    })
  );

  return rates as Record<MetricName, number>;
}

// ============================================
// CALCULATED RATES
// ============================================

/**
 * Get empty search result rate (searches with 0 results / total searches)
 */
export async function getEmptySearchRate(): Promise<number> {
  const [searches, emptySearches] = await Promise.all([
    getMetricRate("searches"),
    getMetricRate("search_empty"),
  ]);

  if (searches === 0) return 0;
  return Math.round((emptySearches / searches) * 100) / 100;
}

/**
 * Get post abandon rate (started - completed / started)
 */
export async function getPostAbandonRate(): Promise<number> {
  const [starts, completes] = await Promise.all([
    getMetricRate("post_starts"),
    getMetricRate("post_completes"),
  ]);

  if (starts === 0) return 0;
  const abandons = Math.max(0, starts - completes);
  return Math.round((abandons / starts) * 100) / 100;
}

/**
 * Get auth failure rate
 */
export async function getAuthFailureRate(): Promise<number> {
  const [attempts, failures] = await Promise.all([
    getMetricRate("auth_attempts"),
    getMetricRate("auth_failures"),
  ]);

  if (attempts === 0) return 0;
  return Math.round((failures / attempts) * 100) / 100;
}

// ============================================
// HEALTH CHECK
// ============================================

export interface HealthMetrics {
  searchesPerMinute: number;
  emptySearchRate: number;
  postAbandonRate: number;
  authFailureRate: number;
  slowQueriesPerMinute: number;
  recentSlowQueriesCount: number;
  status: "healthy" | "degraded" | "critical";
}

/**
 * Get system health metrics
 */
export async function getHealthMetrics(): Promise<HealthMetrics> {
  const [
    searchesPerMinute,
    emptySearchRate,
    postAbandonRate,
    authFailureRate,
    slowQueriesPerMinute,
  ] = await Promise.all([
    getMetricRate("searches"),
    getEmptySearchRate(),
    getPostAbandonRate(),
    getAuthFailureRate(),
    getMetricRate("slow_queries"),
  ]);

  // Determine overall status
  let status: HealthMetrics["status"] = "healthy";
  
  if (authFailureRate > 0.5 || slowQueriesPerMinute > 20) {
    status = "critical";
  } else if (emptySearchRate > 0.3 || postAbandonRate > 0.7 || slowQueriesPerMinute > 10) {
    status = "degraded";
  }

  return {
    searchesPerMinute,
    emptySearchRate,
    postAbandonRate,
    authFailureRate,
    slowQueriesPerMinute,
    recentSlowQueriesCount: recentSlowQueries.length,
    status,
  };
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

import { Request, Response, NextFunction } from "express";

/**
 * Middleware to track request timing
 */
export function requestTimingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration >= SLOW_QUERY_THRESHOLD_MS) {
      logWarn(`Slow request: ${req.method} ${req.path}`, {
        durationMs: duration,
        statusCode: res.statusCode,
        ip: req.ip,
      });
    }
  });

  next();
}

// ============================================
// MONGOOSE PLUGIN (for query timing)
// ============================================

import mongoose from "mongoose";

/**
 * Mongoose plugin to log slow queries
 * Usage: schema.plugin(slowQueryPlugin);
 */
export function slowQueryPlugin(schema: mongoose.Schema): void {
  // Pre hooks for timing
  schema.pre(["find", "findOne", "findOneAndUpdate", "countDocuments"], function() {
    (this as any)._startTime = Date.now();
  });

  // Post hooks for logging
  schema.post(["find", "findOne", "findOneAndUpdate", "countDocuments"], function(result: any) {
    const startTime = (this as any)._startTime;
    if (startTime) {
      const duration = Date.now() - startTime;
      const operation = (this as any).op || "unknown";
      
      if (duration >= SLOW_QUERY_THRESHOLD_MS) {
        logWarn(`Slow Mongoose query: ${operation}`, {
          durationMs: duration,
          collection: (this as any).mongooseCollection?.name || "unknown",
        });
        incrementMetric("slow_queries").catch(() => {});
      }
    }
  });
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Query timing
  startQueryTimer,
  logSlowQuery,
  getRecentSlowQueries,
  
  // Metrics
  incrementMetric,
  getMetricRate,
  getAllMetrics,
  
  // Calculated rates
  getEmptySearchRate,
  getPostAbandonRate,
  getAuthFailureRate,
  
  // Health
  getHealthMetrics,
  
  // Middleware
  requestTimingMiddleware,
  slowQueryPlugin,
};
