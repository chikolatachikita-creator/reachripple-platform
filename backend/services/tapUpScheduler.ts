import { getRedis } from './cacheService';
import Ad from '../models/Ad';
import { AuditLog } from '../models/AuditLog';
import { logInfo, logWarn, logError, logDebug } from '../utils/logger';
import { SCHEDULER_CONFIG } from '../constants/boostConfig';

/**
 * Tap-Up Scheduler Service
 * 
 * Uses Redis ZSET for efficient auto-bump scheduling:
 * - ZADD: Schedule next bump with score = timestamp
 * - ZRANGEBYSCORE: Get all ads due for bump
 * - Atomic ZPOPMIN: Claim job for processing
 * 
 * Runs every 5 seconds, processes all due bumps
 */

const { TAP_UP_CHECK_INTERVAL_MS, LOCK_TTL_MS, REDIS_KEY_PREFIX } = SCHEDULER_CONFIG;

const SCHEDULER_KEY = `${REDIS_KEY_PREFIX}:scheduled`;
const LOCK_KEY = `${REDIS_KEY_PREFIX}:lock`;

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

// ============================================
// SCHEDULER OPERATIONS
// ============================================

/**
 * Schedule an ad for next auto-bump
 * @param adId - Ad ID
 * @param nextBumpAt - When to bump (Date or timestamp)
 */
export async function scheduleNextBump(adId: string, nextBumpAt: Date | number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    logWarn('Tap-Up scheduler: Redis not available');
    return false;
  }
  
  const timestamp = typeof nextBumpAt === 'number' ? nextBumpAt : nextBumpAt.getTime();
  
  try {
    // ZADD with score = timestamp, value = adId
    await redis.zadd(SCHEDULER_KEY, timestamp, adId);
    
    logDebug('Scheduled auto-bump', { adId, nextBumpAt: new Date(timestamp).toISOString() });
    return true;
  } catch (error) {
    logError('Failed to schedule auto-bump', error as Error, { adId });
    return false;
  }
}

/**
 * Remove an ad from the schedule (e.g., when deactivating Tap Up)
 */
export async function unscheduleBump(adId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  
  try {
    await redis.zrem(SCHEDULER_KEY, adId);
    logDebug('Unscheduled auto-bump', { adId });
    return true;
  } catch (error) {
    logError('Failed to unschedule auto-bump', error as Error, { adId });
    return false;
  }
}

/**
 * Get all ads due for bump (score <= now)
 */
async function getDueBumps(): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];
  
  const now = Date.now();
  
  try {
    // Get all items with score <= now
    const dueAds = await redis.zrangebyscore(SCHEDULER_KEY, '-inf', now);
    return dueAds;
  } catch (error) {
    logError('Failed to get due bumps', error as Error);
    return [];
  }
}

/**
 * Claim a job for processing (atomic pop)
 */
async function claimJob(adId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  
  try {
    // Remove from queue (atomic)
    const removed = await redis.zrem(SCHEDULER_KEY, adId);
    return removed > 0;
  } catch (error) {
    logError('Failed to claim job', error as Error, { adId });
    return false;
  }
}

/**
 * Acquire scheduler lock (prevent multiple instances processing same jobs)
 */
async function acquireLock(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  
  try {
    // SET NX with expiry
    const result = await redis.set(LOCK_KEY, process.pid.toString(), 'PX', LOCK_TTL_MS, 'NX');
    return result === 'OK';
  } catch (error) {
    return false;
  }
}

/**
 * Release scheduler lock
 */
async function releaseLock(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    await redis.del(LOCK_KEY);
  } catch (error) {
    // Ignore
  }
}

// ============================================
// BUMP PROCESSING
// ============================================

/**
 * Process a single auto-bump
 */
async function processAutoBump(adId: string): Promise<boolean> {
  try {
    const ad = await Ad.findById(adId);
    
    if (!ad) {
      logWarn('Auto-bump: Ad not found', { adId });
      return false;
    }
    
    // Check if Tap Up is still active
    if (!ad.hasTapUp) {
      logDebug('Auto-bump: Tap Up no longer active', { adId });
      return false;
    }
    
    // Check if subscription has expired
    if (ad.tapUpUntil && new Date(ad.tapUpUntil) < new Date()) {
      logDebug('Auto-bump: Subscription expired', { adId });
      
      // Deactivate Tap Up
      await Ad.findByIdAndUpdate(adId, {
        hasTapUp: false,
        nextTapUpAt: undefined,
      });
      
      return false;
    }
    
    // Check ad status
    if (ad.status !== 'approved' || ad.isDeleted) {
      logDebug('Auto-bump: Ad not active', { adId, status: ad.status });
      return false;
    }
    
    // Perform the bump
    const now = new Date();
    const intervalHours = ad.tapUpIntervalHours || 12;
    const nextBumpAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    
    await Ad.findByIdAndUpdate(adId, {
      lastPulsedAt: now,
      nextTapUpAt: nextBumpAt,
    });
    
    // Schedule next bump
    await scheduleNextBump(adId, nextBumpAt);
    
    // Log to audit
    await AuditLog.log('TAP_UP_BUMP', {
      adId: ad._id,
      userId: ad.userId,
      isSystem: true,
      metadata: {
        intervalHours,
        nextBumpAt: nextBumpAt.toISOString(),
      },
    });
    
    logInfo('Auto-bump executed', {
      adId,
      nextBumpAt: nextBumpAt.toISOString(),
    });
    
    return true;
  } catch (error) {
    logError('Failed to process auto-bump', error as Error, { adId });
    return false;
  }
}

// ============================================
// MAIN LOOP
// ============================================

/**
 * Run one iteration of the scheduler
 */
async function runSchedulerTick(): Promise<void> {
  // Try to acquire lock
  const hasLock = await acquireLock();
  if (!hasLock) {
    // Another instance is processing
    return;
  }
  
  try {
    // Get all due bumps
    const dueAds = await getDueBumps();
    
    if (dueAds.length === 0) {
      return;
    }
    
    logDebug('Processing due bumps', { count: dueAds.length });
    
    // Process each ad
    let successCount = 0;
    for (const adId of dueAds) {
      // Claim the job atomically
      const claimed = await claimJob(adId);
      if (!claimed) continue;
      
      // Process the bump
      const success = await processAutoBump(adId);
      if (success) successCount++;
    }
    
    if (successCount > 0) {
      logInfo('Scheduler tick completed', {
        processed: dueAds.length,
        succeeded: successCount,
      });
    }
  } finally {
    await releaseLock();
  }
}

// ============================================
// LIFECYCLE MANAGEMENT
// ============================================

/**
 * Start the scheduler
 */
export function startScheduler(): void {
  if (isRunning) {
    logWarn('Tap-Up scheduler already running');
    return;
  }
  
  const redis = getRedis();
  if (!redis) {
    logWarn('Tap-Up scheduler: Redis not available, running in fallback mode');
    // Fall back to MongoDB-based polling (existing bumpService.ts)
    return;
  }
  
  isRunning = true;
  
  // Initial tick
  runSchedulerTick().catch(err => logError('Scheduler tick error', err));
  
  // Schedule recurring ticks
  intervalId = setInterval(() => {
    runSchedulerTick().catch(err => logError('Scheduler tick error', err));
  }, TAP_UP_CHECK_INTERVAL_MS);
  
  logInfo('Tap-Up scheduler started', {
    intervalMs: TAP_UP_CHECK_INTERVAL_MS,
  });
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (!isRunning) return;
  
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  isRunning = false;
  logInfo('Tap-Up scheduler stopped');
}

/**
 * Migrate existing Tap Up ads to Redis scheduler
 * Run once on startup to ensure all active Tap Ups are scheduled
 */
export async function migrateToRedisScheduler(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    const now = new Date();
    
    // Find all ads with active Tap Up
    const activeAds = await Ad.find({
      hasTapUp: true,
      tapUpUntil: { $gt: now },
      status: 'approved',
      isDeleted: { $ne: true },
    }).select('_id nextTapUpAt tapUpIntervalHours');
    
    let scheduledCount = 0;
    
    for (const ad of activeAds) {
      // Determine next bump time
      let nextBumpAt = ad.nextTapUpAt;
      
      if (!nextBumpAt || new Date(nextBumpAt) < now) {
        // If no next bump scheduled or it's in the past, schedule now + interval
        const intervalHours = ad.tapUpIntervalHours || 12;
        nextBumpAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
        
        // Update ad
        await Ad.findByIdAndUpdate(ad._id, { nextTapUpAt: nextBumpAt });
      }
      
      // Add to scheduler
      await scheduleNextBump(ad._id.toString(), nextBumpAt);
      scheduledCount++;
    }
    
    if (scheduledCount > 0) {
      logInfo('Migrated Tap Up ads to Redis scheduler', { count: scheduledCount });
    }
  } catch (error) {
    logError('Failed to migrate to Redis scheduler', error as Error);
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  scheduleNextBump,
  unscheduleBump,
  startScheduler,
  stopScheduler,
  migrateToRedisScheduler,
};
