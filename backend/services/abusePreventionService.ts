import { Types } from 'mongoose';
import Ad from '../models/Ad';
import User from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { logInfo, logWarn, logError } from '../utils/logger';
import { POSTING_LIMITS, AccountType, PostingPlan } from '../constants/boostConfig';

/**
 * Abuse Prevention Service
 * 
 * Handles:
 * - Daily bump caps
 * - Click/view deduplication
 * - Suspicious activity detection
 * - Rate limiting enforcement
 */

// ============================================
// CONFIGURATION
// ============================================

export const ABUSE_LIMITS = {
  // Bump limits
  MAX_MANUAL_BUMPS_PER_DAY: 20,        // Max Tumble Up per ad per day
  MAX_BUMPS_PER_HOUR: 6,               // Max bumps per ad per hour (rate limit)
  BUMP_COOLDOWN_MINUTES: 10,           // Minimum time between bumps
  
  // Click/view deduplication
  VIEW_DEDUP_WINDOW_SECONDS: 60,       // Same viewer = 1 view per minute
  CLICK_DEDUP_WINDOW_SECONDS: 30,      // Same clicker = 1 click per 30s
  
  // Suspicious activity thresholds
  MAX_USERS_PER_IP_HOUR: 3,            // Max unique users bumping from same IP
  SUSPICIOUS_BUMP_VELOCITY: 10,        // Bumps in 5 minutes = suspicious
  SUSPICIOUS_VELOCITY_WINDOW_MIN: 5,   // Window for velocity check
  
  // Account-level limits
  MAX_ADS_PER_USER: 10,                // Max active ads per account
  MAX_TIER_PURCHASES_PER_DAY: 5,       // Max tier purchases per day per user
};

// ============================================
// BUMP ABUSE PREVENTION
// ============================================

export interface BumpCheckResult {
  allowed: boolean;
  reason?: string;
  remainingBumps?: number;
  nextBumpAvailable?: Date;
  rateLimit?: boolean;
}

/**
 * Check if a bump is allowed (enforces daily cap + rate limit)
 */
export async function checkBumpAllowed(
  adId: Types.ObjectId,
  userId: Types.ObjectId,
  ip?: string
): Promise<BumpCheckResult> {
  const now = new Date();
  
  // 1. Check daily limit
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  const dailyBumps = await AuditLog.countDocuments({
    adId,
    action: 'TUMBLE_UP',
    createdAt: { $gte: startOfDay },
  });
  
  if (dailyBumps >= ABUSE_LIMITS.MAX_MANUAL_BUMPS_PER_DAY) {
    logWarn('Daily bump limit reached', { adId, userId, dailyBumps });
    
    await AuditLog.log('RATE_LIMITED', {
      adId,
      userId,
      ip,
      severity: 'warning',
      reason: 'Daily bump limit reached',
      metadata: { dailyBumps, limit: ABUSE_LIMITS.MAX_MANUAL_BUMPS_PER_DAY },
    });
    
    return {
      allowed: false,
      reason: `Daily bump limit reached (${ABUSE_LIMITS.MAX_MANUAL_BUMPS_PER_DAY}/day)`,
      remainingBumps: 0,
      rateLimit: true,
    };
  }
  
  // 2. Check hourly rate
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const hourlyBumps = await AuditLog.countDocuments({
    adId,
    action: 'TUMBLE_UP',
    createdAt: { $gte: oneHourAgo },
  });
  
  if (hourlyBumps >= ABUSE_LIMITS.MAX_BUMPS_PER_HOUR) {
    logWarn('Hourly bump rate exceeded', { adId, userId, hourlyBumps });
    
    await AuditLog.log('RATE_LIMITED', {
      adId,
      userId,
      ip,
      severity: 'warning',
      reason: 'Hourly bump rate exceeded',
      metadata: { hourlyBumps, limit: ABUSE_LIMITS.MAX_BUMPS_PER_HOUR },
    });
    
    return {
      allowed: false,
      reason: `Too many bumps this hour (${ABUSE_LIMITS.MAX_BUMPS_PER_HOUR}/hour)`,
      rateLimit: true,
    };
  }
  
  // 3. Check cooldown
  const ad = await Ad.findById(adId).select('pulseCooldownUntil');
  if (ad?.pulseCooldownUntil && now < new Date(ad.pulseCooldownUntil)) {
    const remainingMs = new Date(ad.pulseCooldownUntil).getTime() - now.getTime();
    const remainingMins = Math.ceil(remainingMs / (1000 * 60));
    
    return {
      allowed: false,
      reason: `Cooldown active. Try again in ${remainingMins} minutes`,
      nextBumpAvailable: ad.pulseCooldownUntil,
    };
  }
  
  // 4. Check for IP abuse (same IP bumping multiple users' ads)
  if (ip) {
    const ipAbuseResult = await AuditLog.detectIpAbuse(ip, 1);
    if (ipAbuseResult.suspicious) {
      logWarn('IP abuse detected', { ip, reason: ipAbuseResult.reason });
      
      await AuditLog.log('ABUSE_DETECTED', {
        adId,
        userId,
        ip,
        severity: 'critical',
        reason: ipAbuseResult.reason,
        metadata: { suspiciousUsers: ipAbuseResult.users },
      });
      
      return {
        allowed: false,
        reason: 'Suspicious activity detected. Please try again later.',
      };
    }
  }
  
  // 5. Check bump velocity (many bumps in short window)
  const velocityWindow = new Date(now.getTime() - ABUSE_LIMITS.SUSPICIOUS_VELOCITY_WINDOW_MIN * 60 * 1000);
  const recentBumps = await AuditLog.countDocuments({
    userId,
    action: 'TUMBLE_UP',
    createdAt: { $gte: velocityWindow },
  });
  
  if (recentBumps >= ABUSE_LIMITS.SUSPICIOUS_BUMP_VELOCITY) {
    logWarn('Suspicious bump velocity', { userId, recentBumps });
    
    await AuditLog.log('ABUSE_DETECTED', {
      userId,
      ip,
      severity: 'warning',
      reason: 'Suspicious bump velocity',
      metadata: { recentBumps, window: ABUSE_LIMITS.SUSPICIOUS_VELOCITY_WINDOW_MIN },
    });
    
    return {
      allowed: false,
      reason: 'Too many bumps in a short time. Please wait a few minutes.',
    };
  }
  
  return {
    allowed: true,
    remainingBumps: ABUSE_LIMITS.MAX_MANUAL_BUMPS_PER_DAY - dailyBumps - 1,
  };
}

/**
 * Log a successful bump
 */
export async function logBump(
  adId: Types.ObjectId,
  userId: Types.ObjectId,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await AuditLog.log('TUMBLE_UP', {
    adId,
    userId,
    ip,
    userAgent,
    severity: 'info',
  });
}

// ============================================
// CLICK/VIEW DEDUPLICATION
// ============================================

// In-memory cache for recent views/clicks (for performance)
// In production, use Redis for this
const viewCache = new Map<string, number>();
const clickCache = new Map<string, number>();

/**
 * Check if a view should be counted (deduplicated)
 */
export function shouldCountView(
  adId: string,
  viewerIdentifier: string  // IP or userId
): boolean {
  const cacheKey = `${adId}:${viewerIdentifier}`;
  const lastView = viewCache.get(cacheKey);
  const now = Date.now();
  
  if (lastView && (now - lastView) < ABUSE_LIMITS.VIEW_DEDUP_WINDOW_SECONDS * 1000) {
    return false;  // Duplicate view, don't count
  }
  
  viewCache.set(cacheKey, now);
  
  // Clean old entries periodically (simple LRU)
  if (viewCache.size > 10000) {
    const oldestKey = viewCache.keys().next().value;
    if (oldestKey) viewCache.delete(oldestKey);
  }
  
  return true;
}

/**
 * Check if a click should be counted (deduplicated)
 */
export function shouldCountClick(
  adId: string,
  clickerIdentifier: string  // IP or userId
): boolean {
  const cacheKey = `${adId}:${clickerIdentifier}`;
  const lastClick = clickCache.get(cacheKey);
  const now = Date.now();
  
  if (lastClick && (now - lastClick) < ABUSE_LIMITS.CLICK_DEDUP_WINDOW_SECONDS * 1000) {
    return false;  // Duplicate click, don't count
  }
  
  clickCache.set(cacheKey, now);
  
  // Clean old entries periodically
  if (clickCache.size > 10000) {
    const oldestKey = clickCache.keys().next().value;
    if (oldestKey) clickCache.delete(oldestKey);
  }
  
  return true;
}

// ============================================
// TIER PURCHASE LIMITS
// ============================================

/**
 * Check if user can purchase a tier (daily limit)
 */
export async function checkTierPurchaseAllowed(
  userId: Types.ObjectId
): Promise<{ allowed: boolean; reason?: string }> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const dailyPurchases = await AuditLog.countDocuments({
    userId,
    action: 'TIER_UPGRADE',
    createdAt: { $gte: startOfDay },
  });
  
  if (dailyPurchases >= ABUSE_LIMITS.MAX_TIER_PURCHASES_PER_DAY) {
    return {
      allowed: false,
      reason: `Maximum ${ABUSE_LIMITS.MAX_TIER_PURCHASES_PER_DAY} tier purchases per day`,
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can create more ads (account-type & plan aware)
 * Limits ONLY apply to monetised/adult categories (escorts, adult-entertainment, etc).
 * Free community categories (vehicles, jobs, buy-sell, etc.) are unlimited.
 * Independent free: 1, basic: 3, premium: 5
 * Agency free: 10, basic: 50, premium: 150
 */
const LIMITED_CATEGORY_SLUGS = new Set([
  'escorts', 'escort', 'trans-escorts', 'gay-escorts',
  'adult-entertainment', 'adult-dating', 'free-personals',
]);
const LIMITED_CATEGORY_NAMES = new Set([
  'escorts', 'trans escorts', 'gay escorts',
  'adult entertainment', 'adult dating', 'free personals',
]);

function isLimitedCategory(category?: string, categorySlug?: string): boolean {
  if (categorySlug && LIMITED_CATEGORY_SLUGS.has(categorySlug.toLowerCase().trim())) return true;
  if (category && LIMITED_CATEGORY_NAMES.has(category.toLowerCase().trim())) return true;
  return false;
}

export async function checkAdCreationAllowed(
  userId: Types.ObjectId,
  category?: string,
  categorySlug?: string
): Promise<{ allowed: boolean; reason?: string; currentCount?: number; maxAllowed?: number }> {
  // Fetch user to determine account type and plan
  const user = await User.findById(userId).select('accountType postingPlan').lean();
  const accountType: AccountType = (user?.accountType as AccountType) || 'independent';
  const postingPlan: PostingPlan = (user?.postingPlan as PostingPlan) || 'free';
  
  const limits = POSTING_LIMITS[accountType]?.[postingPlan] 
    || POSTING_LIMITS.independent.free;

  // Limits only enforced for monetised/adult categories.
  // For free community categories (vehicles, jobs, buy-sell, etc.) skip the check entirely.
  if (category !== undefined || categorySlug !== undefined) {
    if (!isLimitedCategory(category, categorySlug)) {
      return { allowed: true, currentCount: 0, maxAllowed: Number.MAX_SAFE_INTEGER };
    }
  }

  // Count only ads in limited (adult/escort) categories
  const activeAds = await Ad.countDocuments({
    userId,
    isDeleted: { $ne: true },
    status: { $ne: 'rejected' },
    $or: [
      { categorySlug: { $in: Array.from(LIMITED_CATEGORY_SLUGS) } },
      { category: { $in: Array.from(LIMITED_CATEGORY_NAMES).map(n => new RegExp(`^${n}$`, 'i')) } },
    ],
  });
  
  if (activeAds >= limits.maxActiveAds) {
    return {
      allowed: false,
      reason: `Maximum ${limits.maxActiveAds} active escort/adult listings for ${accountType} ${postingPlan} plan. Upgrade to post more. Other categories remain unlimited.`,
      currentCount: activeAds,
      maxAllowed: limits.maxActiveAds,
    };
  }
  
  return { allowed: true, currentCount: activeAds, maxAllowed: limits.maxActiveAds };
}

// ============================================
// ABUSE REPORT GENERATION
// ============================================

export interface AbuseReport {
  period: string;
  totalEvents: number;
  criticalEvents: number;
  warningEvents: number;
  topAbusers: Array<{
    userId: string;
    eventCount: number;
    types: string[];
  }>;
  suspiciousIps: Array<{
    ip: string;
    uniqueUsers: number;
    totalEvents: number;
  }>;
}

/**
 * Generate abuse report for admin dashboard
 */
export async function generateAbuseReport(hours: number = 24): Promise<AbuseReport> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  // Get all abuse-related events
  const events = await AuditLog.find({
    createdAt: { $gte: since },
    severity: { $in: ['warning', 'critical'] },
  });
  
  // Aggregate by user
  const userEvents = await AuditLog.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        severity: { $in: ['warning', 'critical'] },
        userId: { $exists: true },
      },
    },
    {
      $group: {
        _id: '$userId',
        eventCount: { $sum: 1 },
        types: { $addToSet: '$action' },
      },
    },
    { $sort: { eventCount: -1 } },
    { $limit: 10 },
  ]);
  
  // Aggregate by IP
  const ipEvents = await AuditLog.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        ip: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$ip',
        uniqueUsers: { $addToSet: '$userId' },
        totalEvents: { $sum: 1 },
      },
    },
    {
      $project: {
        ip: '$_id',
        uniqueUsers: { $size: '$uniqueUsers' },
        totalEvents: 1,
      },
    },
    { $match: { uniqueUsers: { $gt: 2 } } },
    { $sort: { uniqueUsers: -1 } },
    { $limit: 10 },
  ]);
  
  return {
    period: `Last ${hours} hours`,
    totalEvents: events.length,
    criticalEvents: events.filter(e => e.severity === 'critical').length,
    warningEvents: events.filter(e => e.severity === 'warning').length,
    topAbusers: userEvents.map(u => ({
      userId: u._id?.toString() || 'unknown',
      eventCount: u.eventCount,
      types: u.types,
    })),
    suspiciousIps: ipEvents.map(i => ({
      ip: i._id,
      uniqueUsers: i.uniqueUsers,
      totalEvents: i.totalEvents,
    })),
  };
}

export default {
  ABUSE_LIMITS,
  checkBumpAllowed,
  logBump,
  shouldCountView,
  shouldCountClick,
  checkTierPurchaseAllowed,
  checkAdCreationAllowed,
  generateAbuseReport,
};
