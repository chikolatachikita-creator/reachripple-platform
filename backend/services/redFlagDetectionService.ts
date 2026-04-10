/**
 * Red Flag Detection Service
 * 
 * Scans ad content for patterns associated with:
 * - Potential trafficking indicators
 * - Under-age language
 * - Third-party control language
 * - Suspicious operational patterns
 * 
 * Runs at:
 * - Ad creation
 * - Ad update
 * - Image upload
 */

import crypto from "crypto";
import mongoose from "mongoose";
import Ad, { AdDocument } from "../models/Ad";
import User from "../models/User";
import { AuditLog } from "../models/AuditLog";
import { logInfo, logWarn } from "../utils/logger";

// ============================================
// RED FLAG TEXT PATTERNS
// ============================================

export interface RedFlagPattern {
  pattern: RegExp;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  points: number;
  description: string;
}

export const RED_FLAG_PATTERNS: RedFlagPattern[] = [
  // Under-age indicators (CRITICAL)
  { pattern: /barely\s*18/i, category: "under_age", severity: "critical", points: 30, description: "Under-age language: 'barely 18'" },
  { pattern: /young\s*teen/i, category: "under_age", severity: "critical", points: 40, description: "Under-age language: 'young teen'" },
  { pattern: /just\s*turned\s*18/i, category: "under_age", severity: "high", points: 20, description: "Age-adjacent language: 'just turned 18'" },
  { pattern: /school\s*girl/i, category: "under_age", severity: "critical", points: 40, description: "Under-age language: 'school girl'" },
  { pattern: /teen(age)?[\s-]*girl/i, category: "under_age", severity: "critical", points: 40, description: "Under-age language: 'teenage girl'" },
  { pattern: /lolita/i, category: "under_age", severity: "critical", points: 40, description: "Under-age reference: 'lolita'" },

  // Third-party control / trafficking indicators (HIGH)
  { pattern: /my\s*girls?/i, category: "trafficking", severity: "high", points: 25, description: "Third-party language: 'my girl(s)'" },
  { pattern: /driver/i, category: "trafficking", severity: "high", points: 20, description: "Trafficking indicator: 'driver' mentioned" },
  { pattern: /no\s*english/i, category: "trafficking", severity: "high", points: 25, description: "Communication barrier: 'no English'" },
  { pattern: /doesn'?t?\s*speak/i, category: "trafficking", severity: "medium", points: 15, description: "Communication barrier: doesn't speak" },
  { pattern: /someone\s*else\s*(answers?|picks?\s*up)/i, category: "trafficking", severity: "high", points: 25, description: "Third-party answering phone" },
  { pattern: /cannot\s*speak\s*freely/i, category: "trafficking", severity: "critical", points: 35, description: "Cannot speak freely indicator" },
  { pattern: /agency\s*managed/i, category: "trafficking", severity: "medium", points: 15, description: "Agency-managed language" },
  { pattern: /handler|manager|boss/i, category: "trafficking", severity: "high", points: 20, description: "Third-party control language" },

  // Suspicious operational patterns (MEDIUM)
  { pattern: /new\s*in\s*town\s*(every|each)\s*(day|week)/i, category: "city_hopping", severity: "high", points: 20, description: "Frequent city-hopping language" },
  { pattern: /new\s*in\s*town/i, category: "city_hopping", severity: "low", points: 5, description: "New in town (common but monitored)" },
  { pattern: /incall\s*only\s*no\s*movement/i, category: "restricted_movement", severity: "high", points: 25, description: "Restricted movement indicator" },
  { pattern: /can'?t?\s*(leave|go\s*out|move)/i, category: "restricted_movement", severity: "high", points: 25, description: "Restricted movement language" },
  { pattern: /deposit\s*required\s*(before|first)/i, category: "scam", severity: "medium", points: 10, description: "Advance deposit pattern" },
  { pattern: /send\s*(money|payment|crypto)\s*(first|before)/i, category: "scam", severity: "high", points: 20, description: "Advance payment scam pattern" },
];

// ============================================
// TEXT SCANNING
// ============================================

export interface RedFlagResult {
  flagged: boolean;
  totalPoints: number;
  matches: {
    pattern: string;
    category: string;
    severity: string;
    points: number;
    description: string;
    matchedText: string;
  }[];
}

/**
 * Scan text content for red flag patterns
 */
export function scanText(text: string): RedFlagResult {
  if (!text || typeof text !== "string") {
    return { flagged: false, totalPoints: 0, matches: [] };
  }

  const matches: RedFlagResult["matches"] = [];
  let totalPoints = 0;

  for (const flag of RED_FLAG_PATTERNS) {
    const match = text.match(flag.pattern);
    if (match) {
      matches.push({
        pattern: flag.pattern.source,
        category: flag.category,
        severity: flag.severity,
        points: flag.points,
        description: flag.description,
        matchedText: match[0],
      });
      totalPoints += flag.points;
    }
  }

  return {
    flagged: matches.length > 0,
    totalPoints,
    matches,
  };
}

/**
 * Scan an ad's title + description for red flags
 */
export function scanAd(ad: { title?: string; description?: string }): RedFlagResult {
  const combinedText = `${ad.title || ""} ${ad.description || ""}`;
  return scanText(combinedText);
}

// ============================================
// IMAGE HASH DETECTION
// ============================================

/**
 * Generate MD5 hash for image content (URL-based for now).
 * In production, replace with perceptual hash (pHash) from image bytes.
 */
export function hashImage(imagePathOrUrl: string): string {
  return crypto.createHash("md5").update(imagePathOrUrl.toLowerCase().trim()).digest("hex");
}

/**
 * Generate hashes for all images in an ad
 */
export function hashAdImages(images: string[]): string[] {
  return (images || []).map(hashImage);
}

/**
 * Check for duplicate images across OTHER accounts
 * Returns accounts reusing the same images
 */
export async function checkImageReuse(
  adId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId,
  imageHashes: string[]
): Promise<{ reused: boolean; matches: { adId: string; userId: string; sharedHashes: number }[] }> {
  if (!imageHashes || imageHashes.length === 0) {
    return { reused: false, matches: [] };
  }

  // Find other ads (from different users) with matching image hashes
  const pipeline = [
    {
      $match: {
        _id: { $ne: new mongoose.Types.ObjectId(String(adId)) },
        userId: { $ne: new mongoose.Types.ObjectId(String(userId)) },
        isDeleted: { $ne: true },
        imageHashes: { $in: imageHashes },
      },
    },
    {
      $project: {
        userId: 1,
        matchedHashes: {
          $size: { $setIntersection: ["$imageHashes", imageHashes] },
        },
      },
    },
    {
      $match: { matchedHashes: { $gte: 1 } },
    },
    { $limit: 10 },
  ];

  const results = await Ad.aggregate(pipeline);

  if (results.length === 0) return { reused: false, matches: [] };

  return {
    reused: true,
    matches: results.map((r: any) => ({
      adId: String(r._id),
      userId: String(r.userId),
      sharedHashes: r.matchedHashes,
    })),
  };
}

// ============================================
// PHONE NUMBER CHECKS
// ============================================

/**
 * Check if a phone number is used across multiple accounts
 */
export async function checkPhoneReuse(
  phone: string,
  currentUserId: string | mongoose.Types.ObjectId
): Promise<{ reused: boolean; count: number; userIds: string[] }> {
  if (!phone) return { reused: false, count: 0, userIds: [] };

  // Normalize phone
  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 7) return { reused: false, count: 0, userIds: [] };

  const otherUsers = await User.find({
    phone: { $regex: normalized.slice(-10) }, // Match last 10 digits
    _id: { $ne: currentUserId },
    deleted: { $ne: true },
  }).select("_id").lean();

  return {
    reused: otherUsers.length > 0,
    count: otherUsers.length,
    userIds: otherUsers.map(u => String(u._id)),
  };
}

// ============================================
// FULL AD SCAN (text + images + phone)
// ============================================

export interface FullScanResult {
  textFlags: RedFlagResult;
  imageReuse: { reused: boolean; matches: { adId: string; userId: string; sharedHashes: number }[] };
  phoneReuse: { reused: boolean; count: number };
  totalRiskPoints: number;
  shouldFlag: boolean;
  flags: string[];           // Human-readable flag list for moderationFlags
}

/**
 * Run full red flag scan on an ad.
 * Called at ad creation and ad update.
 */
export async function fullAdScan(
  ad: AdDocument,
  options: { checkImages?: boolean; checkPhone?: boolean } = { checkImages: true, checkPhone: true }
): Promise<FullScanResult> {
  // 1. Text scan
  const textFlags = scanAd(ad);

  // 2. Image reuse check
  let imageReuse: FullScanResult["imageReuse"] = { reused: false, matches: [] };
  if (options.checkImages && ad.imageHashes && ad.imageHashes.length > 0) {
    imageReuse = await checkImageReuse(String(ad._id), String(ad.userId), ad.imageHashes);
  }

  // 3. Phone reuse check
  let phoneReuse: FullScanResult["phoneReuse"] = { reused: false, count: 0 };
  if (options.checkPhone && ad.phone && ad.userId) {
    const phoneResult = await checkPhoneReuse(ad.phone, String(ad.userId));
    phoneReuse = { reused: phoneResult.reused, count: phoneResult.count };
  }

  // Calculate total risk points
  let totalRiskPoints = textFlags.totalPoints;
  if (imageReuse.reused) totalRiskPoints += 25;
  if (phoneReuse.reused) totalRiskPoints += 30;

  // Determine whether to flag
  const shouldFlag = totalRiskPoints >= 15; // Flag if 15+ risk points

  // Build flag list
  const flags: string[] = [];
  for (const m of textFlags.matches) {
    flags.push(`${m.category}: ${m.description}`);
  }
  if (imageReuse.reused) {
    flags.push(`image_reuse: Images shared with ${imageReuse.matches.length} other account(s)`);
  }
  if (phoneReuse.reused) {
    flags.push(`phone_reuse: Phone used by ${phoneReuse.count} other account(s)`);
  }

  // Log if flagged
  if (shouldFlag && ad._id) {
    await AuditLog.log("RED_FLAG_DETECTED", {
      adId: ad._id,
      userId: ad.userId,
      severity: totalRiskPoints >= 40 ? "critical" : totalRiskPoints >= 20 ? "warning" : "info",
      metadata: {
        textMatches: textFlags.matches.length,
        imageReuse: imageReuse.reused,
        phoneReuse: phoneReuse.reused,
        totalRiskPoints,
        flags,
      },
      reason: `Red flags detected: ${flags.length} issue(s), ${totalRiskPoints} risk points`,
    });

    logWarn("Red flags detected on ad", {
      adId: String(ad._id),
      userId: String(ad.userId),
      totalRiskPoints,
      flagCount: flags.length,
    });
  }

  return {
    textFlags,
    imageReuse,
    phoneReuse,
    totalRiskPoints,
    shouldFlag,
    flags,
  };
}

export default {
  scanText,
  scanAd,
  hashImage,
  hashAdImages,
  checkImageReuse,
  checkPhoneReuse,
  fullAdScan,
  RED_FLAG_PATTERNS,
};
