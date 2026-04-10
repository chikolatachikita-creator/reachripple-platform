/**
 * Scam Detection Service
 *
 * Maintains an independent scamScore (0-100) for each advertiser.
 * Combines text pattern analysis, behavioural signals, complaint ratios,
 * and account-age heuristics.
 *
 * Works alongside the existing riskScore (moderation/safety) — this
 * score specifically targets financial/scam fraud.
 */

import mongoose from "mongoose";
import AdvertiserSignal from "../models/AdvertiserSignal";
import Ad from "../models/Ad";
import Report from "../models/Report";
import User from "../models/User";
import { AuditLog } from "../models/AuditLog";
import { addRiskPoints } from "./riskScoringService";
import { logInfo, logWarn } from "../utils/logger";

// ── Scam Score Weights ─────────────────────────────────────

export const SCAM_WEIGHTS = {
  FRAUD_REPORT: 30,
  DEPOSIT_KEYWORD: 25,
  PHONE_REUSED_FROM_BANNED: 60,
  ACCOUNT_YOUNG: 10,         // < 7 days
  HIGH_COMPLAINT_RATIO: 50,
  RAPID_AD_CREATION: 20,     // > 3 ads in 1 hour
  IMAGE_REUSE_NETWORK: 35,
  MULTIPLE_CITY_RAPID: 15,
  TEMPLATE_AD_COPY: 15,
  VERIFIED_ADVERTISER: -25,
} as const;

// ── Scam Keywords (deposit/advance-fee patterns) ───────────

const SCAM_KEYWORD_PATTERNS = [
  /deposit/i,
  /gift\s?card/i,
  /bitcoin|btc|crypto|eth/i,
  /pay\s?(before|first|in\s?advance)/i,
  /transfer\s?(first|before)/i,
  /send\s?money/i,
  /western\s?union/i,
  /money\s?gram/i,
  /cash\s?app/i,
  /prepaid\s?card/i,
  /bank\s?transfer\s?(only|first)/i,
  /no\s?refund/i,
];

// ── Thresholds ─────────────────────────────────────────────

const SCAM_THRESHOLDS = {
  MANUAL_REVIEW: 60,
  SUSPEND: 100,
  COMPLAINT_RATIO_HIGH: 0.2,
  RAPID_ADS_COUNT: 3,
  RAPID_ADS_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  YOUNG_ACCOUNT_DAYS: 7,
} as const;

// ── Text Scanning ──────────────────────────────────────────

export interface ScamTextResult {
  hasScamKeywords: boolean;
  matchedPatterns: string[];
  points: number;
}

/**
 * Scan ad text for scam-related keywords.
 */
export function scanForScamKeywords(text: string): ScamTextResult {
  const matchedPatterns: string[] = [];

  for (const pattern of SCAM_KEYWORD_PATTERNS) {
    if (pattern.test(text)) {
      matchedPatterns.push(pattern.source);
    }
  }

  return {
    hasScamKeywords: matchedPatterns.length > 0,
    matchedPatterns,
    points: matchedPatterns.length > 0 ? SCAM_WEIGHTS.DEPOSIT_KEYWORD : 0,
  };
}

// ── Complaint Ratio ────────────────────────────────────────

/**
 * Calculate complaint ratio: fraud reports / total interactions.
 * Uses ad clicks (views) as a proxy for interactions.
 */
export async function calculateComplaintRatio(userId: string): Promise<{
  ratio: number;
  fraudReports: number;
  totalViews: number;
  points: number;
}> {
  const [fraudReports, ads] = await Promise.all([
    Report.countDocuments({
      adId: { $in: await Ad.find({ userId, isDeleted: { $ne: true } }).distinct("_id") },
      reason: { $in: ["fraud", "scam", "financial"] },
    }),
    Ad.find({ userId, isDeleted: { $ne: true } })
      .select("views")
      .lean(),
  ]);

  const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const ratio = totalViews > 0 ? fraudReports / totalViews : 0;

  return {
    ratio,
    fraudReports,
    totalViews,
    points: ratio > SCAM_THRESHOLDS.COMPLAINT_RATIO_HIGH ? SCAM_WEIGHTS.HIGH_COMPLAINT_RATIO : 0,
  };
}

// ── Rapid Ad Creation Detection ────────────────────────────

export async function detectRapidAdCreation(userId: string): Promise<{
  isRapid: boolean;
  recentCount: number;
  points: number;
}> {
  const windowStart = new Date(Date.now() - SCAM_THRESHOLDS.RAPID_ADS_WINDOW_MS);

  const recentCount = await Ad.countDocuments({
    userId,
    createdAt: { $gte: windowStart },
    isDeleted: { $ne: true },
  });

  return {
    isRapid: recentCount >= SCAM_THRESHOLDS.RAPID_ADS_COUNT,
    recentCount,
    points: recentCount >= SCAM_THRESHOLDS.RAPID_ADS_COUNT ? SCAM_WEIGHTS.RAPID_AD_CREATION : 0,
  };
}

// ── Phone Abuse (reused from banned user) ──────────────────

export async function checkPhoneFromBannedUser(phone: string): Promise<{
  isBannedPhone: boolean;
  points: number;
}> {
  if (!phone) return { isBannedPhone: false, points: 0 };

  const normalised = phone.replace(/\D/g, "").slice(-10);

  const bannedWithPhone = await User.findOne({
    phone: { $regex: normalised + "$" },
    $or: [
      { status: "suspended" },
      { deleted: true },
    ],
  })
    .select("_id")
    .lean();

  return {
    isBannedPhone: !!bannedWithPhone,
    points: bannedWithPhone ? SCAM_WEIGHTS.PHONE_REUSED_FROM_BANNED : 0,
  };
}

// ── Full Scam Analysis ─────────────────────────────────────

export interface ScamAnalysisResult {
  scamScore: number;
  factors: { signal: string; points: number; detail?: string }[];
  action: "none" | "manual_review" | "suspend";
  previousScore: number;
}

/**
 * Full scam analysis for an advertiser. Updates their scamScore.
 * Call on ad creation, report submission, and nightly batch.
 */
export async function analyseAdvertiserScam(
  userId: string,
  adText?: string
): Promise<ScamAnalysisResult> {
  const factors: { signal: string; points: number; detail?: string }[] = [];
  let totalPoints = 0;

  // 1. Text scanning
  if (adText) {
    const textResult = scanForScamKeywords(adText);
    if (textResult.points > 0) {
      factors.push({
        signal: "deposit_keyword",
        points: textResult.points,
        detail: `Matched: ${textResult.matchedPatterns.join(", ")}`,
      });
      totalPoints += textResult.points;
    }
  }

  // 2. Complaint ratio
  const complaint = await calculateComplaintRatio(userId);
  if (complaint.points > 0) {
    factors.push({
      signal: "high_complaint_ratio",
      points: complaint.points,
      detail: `Ratio: ${complaint.ratio.toFixed(3)} (${complaint.fraudReports} fraud reports / ${complaint.totalViews} views)`,
    });
    totalPoints += complaint.points;
  }

  // 3. Fraud report count
  const fraudReportCount = await Report.countDocuments({
    adId: { $in: await Ad.find({ userId, isDeleted: { $ne: true } }).distinct("_id") },
    reason: { $in: ["fraud", "scam", "financial"] },
  });
  if (fraudReportCount > 0) {
    const pts = fraudReportCount * SCAM_WEIGHTS.FRAUD_REPORT;
    factors.push({
      signal: "fraud_reports",
      points: pts,
      detail: `${fraudReportCount} fraud report(s)`,
    });
    totalPoints += pts;
  }

  // 4. Account age
  const user = await User.findById(userId).select("createdAt phone").lean();
  if (user) {
    const accountAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < SCAM_THRESHOLDS.YOUNG_ACCOUNT_DAYS) {
      factors.push({
        signal: "young_account",
        points: SCAM_WEIGHTS.ACCOUNT_YOUNG,
        detail: `Account age: ${accountAgeDays.toFixed(1)} days`,
      });
      totalPoints += SCAM_WEIGHTS.ACCOUNT_YOUNG;
    }

    // 5. Phone from banned user
    if (user.phone) {
      const phoneCheck = await checkPhoneFromBannedUser(user.phone);
      if (phoneCheck.points > 0) {
        factors.push({
          signal: "phone_reused_from_banned",
          points: phoneCheck.points,
          detail: "Phone number was used by a banned account",
        });
        totalPoints += phoneCheck.points;
      }
    }
  }

  // 6. Rapid ad creation
  const rapidCheck = await detectRapidAdCreation(userId);
  if (rapidCheck.points > 0) {
    factors.push({
      signal: "rapid_ad_creation",
      points: rapidCheck.points,
      detail: `${rapidCheck.recentCount} ads in last hour`,
    });
    totalPoints += rapidCheck.points;
  }

  // Clamp to 0-100
  const scamScore = Math.max(0, Math.min(100, totalPoints));

  // Get previous score
  const signal = await AdvertiserSignal.getOrCreate(userId);
  const previousScore = signal.scamScore;

  // Update scam score
  signal.scamScore = scamScore;
  await signal.save();

  // Determine action
  let action: "none" | "manual_review" | "suspend" = "none";
  if (scamScore >= SCAM_THRESHOLDS.SUSPEND) {
    action = "suspend";
  } else if (scamScore >= SCAM_THRESHOLDS.MANUAL_REVIEW) {
    action = "manual_review";
  }

  // If score increased significantly, also bump risk score
  if (scamScore > previousScore && scamScore >= SCAM_THRESHOLDS.MANUAL_REVIEW) {
    await addRiskPoints(userId, Math.min(20, scamScore - previousScore), "SCAM_SCORE_HIGH", `Scam score: ${scamScore}`);
  }

  // Audit log for high scam scores
  if (scamScore >= SCAM_THRESHOLDS.MANUAL_REVIEW && scamScore > previousScore) {
    await AuditLog.log("ABUSE_DETECTED", {
      userId: new mongoose.Types.ObjectId(userId),
      severity: action === "suspend" ? "critical" : "warning",
      reason: `Scam score ${scamScore} (${action})`,
      metadata: { scamScore, previousScore, factors, action },
      isSystem: true,
    });

    logWarn(`[ScamDetection] User ${userId}: scamScore ${previousScore} → ${scamScore} (${action})`);
  }

  return { scamScore, factors, action, previousScore };
}
