/**
 * Trust & Safety Scoring Service
 * 
 * Backend-only signals for ranking (NOT exposed to UI):
 * - profileCompletenessScore
 * - riskScore
 * - lastActiveAt tracking
 * 
 * Used for internal ranking, NOT displayed to users.
 */

import Ad, { AdDocument } from "../models/Ad";
import User, { UserDocument } from "../models/User";
import { getCache, setCache } from "./cacheService";
import { logInfo, logWarn, logError } from "../utils/logger";
import crypto from "crypto";

// ============================================
// CONFIGURATION
// ============================================

const COMPLETENESS_CACHE_TTL = 5 * 60; // 5 minutes
const RISK_CACHE_TTL = 10 * 60; // 10 minutes

// Weight factors for profile completeness
const COMPLETENESS_WEIGHTS = {
  title: 5,
  description: 15,
  images: 20,
  pricing: 15,
  services: 10,
  profileFields: 10,
  phone: 5,
  email: 5,
  videos: 10,
  age: 5,
};

// Risk factors (higher = more risky)
const RISK_FACTORS = {
  noImages: 30,
  shortDescription: 15,
  noPhone: 10,
  newAccount: 20,
  rapidPosting: 25,
  duplicateImages: 40,
  locationMismatch: 35,
  suspiciousPatterns: 50,
};

// ============================================
// PROFILE COMPLETENESS SCORING
// ============================================

export interface CompletenessResult {
  score: number;           // 0-100
  missingFields: string[];
  recommendations: string[];
}

/**
 * Calculate profile completeness score (0-100)
 * Higher = more complete profile = better ranking
 */
export async function calculateProfileCompleteness(
  ad: AdDocument
): Promise<CompletenessResult> {
  const cacheKey = `completeness:${ad._id}`;
  const cached = await getCache<CompletenessResult>(cacheKey);
  if (cached) return cached;

  let score = 0;
  const maxScore = Object.values(COMPLETENESS_WEIGHTS).reduce((a, b) => a + b, 0);
  const missingFields: string[] = [];
  const recommendations: string[] = [];

  // Title check (5 points)
  if (ad.title && ad.title.length >= 10) {
    score += COMPLETENESS_WEIGHTS.title;
  } else {
    missingFields.push("title");
    recommendations.push("Add a descriptive title (at least 10 characters)");
  }

  // Description check (15 points)
  if (ad.description && ad.description.length >= 100) {
    score += COMPLETENESS_WEIGHTS.description;
  } else if (ad.description && ad.description.length >= 50) {
    score += COMPLETENESS_WEIGHTS.description * 0.5;
    recommendations.push("Expand your description for better visibility");
  } else {
    missingFields.push("description");
    recommendations.push("Add a detailed description (at least 100 characters)");
  }

  // Images check (20 points)
  if (ad.images && ad.images.length >= 3) {
    score += COMPLETENESS_WEIGHTS.images;
  } else if (ad.images && ad.images.length >= 1) {
    score += COMPLETENESS_WEIGHTS.images * 0.5;
    recommendations.push("Add more photos (3+ recommended)");
  } else {
    missingFields.push("images");
    recommendations.push("Add at least one photo");
  }

  // Pricing check (15 points)
  if (ad.pricing && Object.values(ad.pricing).some(v => v)) {
    const priceTiers = Object.values(ad.pricing).filter(v => v).length;
    score += COMPLETENESS_WEIGHTS.pricing * Math.min(priceTiers / 3, 1);
    if (priceTiers < 3) {
      recommendations.push("Add more pricing tiers for different services");
    }
  } else if (ad.price > 0) {
    score += COMPLETENESS_WEIGHTS.pricing * 0.5;
  } else {
    missingFields.push("pricing");
    recommendations.push("Add pricing information");
  }

  // Services check (10 points)
  if (ad.selectedServices && ad.selectedServices.length >= 3) {
    score += COMPLETENESS_WEIGHTS.services;
  } else if (ad.selectedServices && ad.selectedServices.length >= 1) {
    score += COMPLETENESS_WEIGHTS.services * 0.5;
    recommendations.push("Add more services you offer");
  } else {
    missingFields.push("services");
    recommendations.push("Specify the services you offer");
  }

  // Profile fields check (10 points)
  if (ad.profileFields) {
    const filledFields = Object.values(ad.profileFields).filter(v => v).length;
    score += COMPLETENESS_WEIGHTS.profileFields * Math.min(filledFields / 5, 1);
    if (filledFields < 5) {
      recommendations.push("Complete your profile details");
    }
  } else {
    missingFields.push("profileFields");
  }

  // Contact info (10 points total)
  if (ad.phone) score += COMPLETENESS_WEIGHTS.phone;
  else missingFields.push("phone");
  
  if (ad.email) score += COMPLETENESS_WEIGHTS.email;
  else missingFields.push("email");

  // Videos bonus (10 points)
  if (ad.videos && ad.videos.length > 0) {
    score += COMPLETENESS_WEIGHTS.videos;
  }

  // Age (5 points)
  if (ad.age && ad.age >= 18) {
    score += COMPLETENESS_WEIGHTS.age;
  } else {
    missingFields.push("age");
  }

  // Normalize to 0-100
  const normalizedScore = Math.round((score / maxScore) * 100);

  const result: CompletenessResult = {
    score: normalizedScore,
    missingFields,
    recommendations: recommendations.slice(0, 3), // Top 3 recommendations
  };

  await setCache(cacheKey, result, COMPLETENESS_CACHE_TTL);
  return result;
}

// ============================================
// RISK SCORING
// ============================================

export interface RiskResult {
  score: number;           // 0-100 (higher = more risky)
  factors: string[];       // Risk factors detected
  level: "low" | "medium" | "high" | "critical";
}

/**
 * Calculate risk score for an ad (0-100)
 * Higher = more suspicious = lower ranking
 */
export async function calculateRiskScore(
  ad: AdDocument,
  options: {
    userIp?: string;
    checkDuplicates?: boolean;
  } = {}
): Promise<RiskResult> {
  const cacheKey = `risk:${ad._id}`;
  const cached = await getCache<RiskResult>(cacheKey);
  if (cached) return cached;

  let score = 0;
  const factors: string[] = [];
  const maxScore = Object.values(RISK_FACTORS).reduce((a, b) => a + b, 0);

  // No images = risky
  if (!ad.images || ad.images.length === 0) {
    score += RISK_FACTORS.noImages;
    factors.push("no_images");
  }

  // Short description = suspicious
  if (!ad.description || ad.description.length < 50) {
    score += RISK_FACTORS.shortDescription;
    factors.push("short_description");
  }

  // No phone = less trustworthy
  if (!ad.phone) {
    score += RISK_FACTORS.noPhone;
    factors.push("no_phone");
  }

  // New account check
  if (ad.userId) {
    const user = await User.findById(ad.userId);
    if (user) {
      const accountAge = Date.now() - new Date(user.createdAt).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (accountAge < oneDayMs) {
        score += RISK_FACTORS.newAccount;
        factors.push("new_account");
      }

      // Rapid posting check
      const recentAds = await Ad.countDocuments({
        userId: ad.userId,
        createdAt: { $gte: new Date(Date.now() - oneDayMs) },
        isDeleted: { $ne: true },
      });
      if (recentAds > 3) {
        score += RISK_FACTORS.rapidPosting;
        factors.push("rapid_posting");
      }
    }
  }

  // Duplicate image check (if enabled)
  if (options.checkDuplicates && ad.images && ad.images.length > 0) {
    const hasDuplicates = await checkDuplicateImages(ad);
    if (hasDuplicates) {
      score += RISK_FACTORS.duplicateImages;
      factors.push("duplicate_images");
    }
  }

  // Normalize to 0-100
  const normalizedScore = Math.min(Math.round((score / maxScore) * 100), 100);

  // Determine risk level
  let level: RiskResult["level"];
  if (normalizedScore >= 70) level = "critical";
  else if (normalizedScore >= 50) level = "high";
  else if (normalizedScore >= 25) level = "medium";
  else level = "low";

  const result: RiskResult = {
    score: normalizedScore,
    factors,
    level,
  };

  await setCache(cacheKey, result, RISK_CACHE_TTL);
  return result;
}

// ============================================
// DUPLICATE IMAGE DETECTION
// ============================================

/**
 * Generate MD5 hash for an image URL (for duplicate detection)
 * Note: This is a simple URL-based check. For production, 
 * implement perceptual hashing (pHash) for similarity detection.
 */
export function hashImageUrl(url: string): string {
  return crypto.createHash("md5").update(url).digest("hex");
}

/**
 * Check if ad has duplicate images used elsewhere
 */
export async function checkDuplicateImages(ad: AdDocument): Promise<boolean> {
  if (!ad.images || ad.images.length === 0) return false;

  const imageHashes = ad.images.map(hashImageUrl);
  
  // Find other ads with same image hashes
  const duplicates = await Ad.countDocuments({
    _id: { $ne: ad._id },
    userId: { $ne: ad.userId },
    images: { $in: ad.images },
    isDeleted: { $ne: true },
  });

  return duplicates > 0;
}

// ============================================
// ACTIVITY TRACKING
// ============================================

/**
 * Update last active timestamp for an ad
 */
export async function updateLastActive(adId: string): Promise<void> {
  try {
    await Ad.findByIdAndUpdate(adId, { lastActive: new Date() });
  } catch (err) {
    logWarn("Failed to update lastActive", { adId, error: err });
  }
}

/**
 * Update last active for a user's ads when they're online
 */
export async function updateUserAdsActivity(userId: string): Promise<void> {
  try {
    await Ad.updateMany(
      { userId, status: "approved", isDeleted: { $ne: true } },
      { lastActive: new Date() }
    );
  } catch (err) {
    logWarn("Failed to update user ads activity", { userId, error: err });
  }
}

// ============================================
// COMBINED QUALITY SCORE
// ============================================

/**
 * Calculate combined quality score for ranking
 * Used by ranking service for result ordering
 */
export async function calculateQualityScore(ad: AdDocument): Promise<number> {
  const [completeness, risk] = await Promise.all([
    calculateProfileCompleteness(ad),
    calculateRiskScore(ad),
  ]);

  // Quality = completeness - risk (with safety bounds)
  // Range: 0-100
  const qualityScore = Math.max(0, Math.min(100, completeness.score - (risk.score * 0.5)));
  
  return Math.round(qualityScore);
}

/**
 * Update quality score in database (run periodically or on changes)
 */
export async function updateAdQualityScore(adId: string): Promise<number> {
  const ad = await Ad.findById(adId);
  if (!ad) return 0;

  const score = await calculateQualityScore(ad);
  await Ad.findByIdAndUpdate(adId, { qualityScore: score });
  
  return score;
}

export default {
  calculateProfileCompleteness,
  calculateRiskScore,
  calculateQualityScore,
  updateAdQualityScore,
  updateLastActive,
  updateUserAdsActivity,
  checkDuplicateImages,
  hashImageUrl,
};
