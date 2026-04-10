/**
 * Redis caching service for frequently accessed data
 */

import Redis from "ioredis";
import logger from "../utils/logger";

// Redis client singleton
let redis: Redis | null = null;

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CACHE_ENABLED = process.env.CACHE_ENABLED !== "false";

// Cache TTL in seconds
export const CACHE_TTL = {
  ADMIN_STATS: 5 * 60, // 5 minutes
  USER_PROFILE: 10 * 60, // 10 minutes
  AD_DETAILS: 5 * 60, // 5 minutes
  ADS_LIST: 2 * 60, // 2 minutes
  SETTINGS: 30 * 60, // 30 minutes
};

/**
 * Initialize Redis connection
 */
export const initRedis = (): Redis | null => {
  if (!CACHE_ENABLED) {
    logger.info("📦 Caching disabled");
    return null;
  }

  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
      },
    });

    redis.on("connect", () => {
      logger.info("📦 Redis connected");
    });

    redis.on("error", (err) => {
      logger.warn("⚠️ Redis error (caching will be disabled):", err.message);
      redis = null;
    });

    // Connect asynchronously
    redis.connect().catch(() => {
      logger.warn("⚠️ Could not connect to Redis. Caching disabled.");
      redis = null;
    });

    return redis;
  } catch (err) {
    logger.warn("⚠️ Redis initialization failed. Caching disabled.");
    return null;
  }
};

/**
 * Get cached value
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  } catch (err) {
    logger.warn("Cache get error:", err);
    return null;
  }
};

/**
 * Set cached value with TTL
 */
export const setCache = async (key: string, value: unknown, ttlSeconds: number): Promise<boolean> => {
  if (!redis) return false;

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.warn("Cache set error:", err);
    return false;
  }
};

/**
 * Delete cached value
 */
export const deleteCache = async (key: string): Promise<boolean> => {
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (err) {
    logger.warn("Cache delete error:", err);
    return false;
  }
};

/**
 * Delete cached values by pattern
 */
export const deleteCachePattern = async (pattern: string): Promise<boolean> => {
  if (!redis) return false;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (err) {
    logger.warn("Cache delete pattern error:", err);
    return false;
  }
};

/**
 * Get Redis client instance (for low-level operations like ZSET)
 */
export const getRedis = (): Redis | null => {
  return redis;
};

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  ADMIN_STATS: "admin:stats",
  USER_PROFILE: (id: string) => `user:${id}`,
  AD_DETAILS: (id: string) => `ad:${id}`,
  ADS_LIST: (query: string) => `ads:list:${query}`,
  SETTINGS: "settings",
};

/**
 * Invalidate caches after data changes
 */
export const invalidateAdCaches = async (): Promise<void> => {
  await deleteCache(CACHE_KEYS.ADMIN_STATS);
  await deleteCachePattern("ads:*");
};

export const invalidateUserCaches = async (userId?: string): Promise<void> => {
  await deleteCache(CACHE_KEYS.ADMIN_STATS);
  if (userId) {
    await deleteCache(CACHE_KEYS.USER_PROFILE(userId));
  }
};

export default {
  initRedis,
  getRedis,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  CACHE_KEYS,
  CACHE_TTL,
  invalidateAdCaches,
  invalidateUserCaches,
};
