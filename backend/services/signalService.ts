/**
 * Signal Extraction & Storage Service
 *
 * Extracts identifiable signals from ad posts, logins, and user actions.
 * Stores them in the AdvertiserSignal collection for cross-account linking.
 * Creates AdvertiserEdge records when shared signals are detected.
 */

import mongoose from "mongoose";
import crypto from "crypto";
import AdvertiserSignal from "../models/AdvertiserSignal";
import AdvertiserEdge, { EdgeSignalType, SIGNAL_STRENGTH } from "../models/AdvertiserEdge";
import { addRiskPoints, RISK_POINTS } from "./riskScoringService";
import { AuditLog } from "../models/AuditLog";
import { logInfo, logWarn } from "../utils/logger";

// ── Helpers ────────────────────────────────────────────────

/** Normalise phone to last 10 digits for comparison. */
function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** Extract /24 subnet from IP (e.g. "1.2.3.4" → "1.2.3"). */
function ipSubnet(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) return parts.slice(0, 3).join(".");
  return ip; // IPv6 or unusual — store full
}

/** Hash a PII value for storage (we don't need to reverse it). */
function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 16);
}

// ── Signal Extraction ──────────────────────────────────────

export interface ExtractedSignals {
  phone?: string;
  whatsapp?: string;
  email?: string;
  ip?: string;
  deviceFingerprint?: string;
  imageHashes?: string[];
  paymentMethod?: string;
  city?: string;
}

/**
 * Store signals for a user and detect shared signals across accounts.
 * Call this on ad creation, ad edit, login, etc.
 */
export async function ingestSignals(
  userId: string,
  signals: ExtractedSignals
): Promise<{ edgesCreated: number; riskIncrease: number }> {
  const sig = await AdvertiserSignal.getOrCreate(userId);

  let edgesCreated = 0;
  let riskIncrease = 0;

  // Helper: add to array if not present
  const addUnique = (arr: string[], val: string) => {
    if (val && !arr.includes(val)) arr.push(val);
  };

  // ── Phone ──
  if (signals.phone) {
    const norm = normalisePhone(signals.phone);
    addUnique(sig.phoneNumbers, norm);
    const result = await detectSharedSignal(userId, "phone", norm, "phoneNumbers");
    edgesCreated += result.edges;
    riskIncrease += result.risk;
  }

  // ── WhatsApp ──
  if (signals.whatsapp) {
    const norm = normalisePhone(signals.whatsapp);
    addUnique(sig.whatsappNumbers, norm);
    const result = await detectSharedSignal(userId, "whatsapp", norm, "whatsappNumbers");
    edgesCreated += result.edges;
    riskIncrease += result.risk;
  }

  // ── Email ──
  if (signals.email) {
    const norm = signals.email.trim().toLowerCase();
    addUnique(sig.emailAddresses, norm);
    // Email edges are low-strength (people legitimately share domains)
  }

  // ── IP (subnet) ──
  if (signals.ip) {
    const subnet = ipSubnet(signals.ip);
    addUnique(sig.ipAddresses, subnet);
    const result = await detectSharedSignal(userId, "ip_subnet", subnet, "ipAddresses");
    edgesCreated += result.edges;
    riskIncrease += result.risk;
  }

  // ── Device fingerprint ──
  if (signals.deviceFingerprint) {
    addUnique(sig.deviceFingerprints, signals.deviceFingerprint);
    const result = await detectSharedSignal(userId, "device", signals.deviceFingerprint, "deviceFingerprints");
    edgesCreated += result.edges;
    riskIncrease += result.risk;
  }

  // ── Image hashes (perceptual) ──
  if (signals.imageHashes && signals.imageHashes.length > 0) {
    for (const hash of signals.imageHashes) {
      addUnique(sig.imageHashes, hash);
    }
    const result = await detectSharedImageSignals(userId, signals.imageHashes);
    edgesCreated += result.edges;
    riskIncrease += result.risk;
  }

  // ── Payment method ──
  if (signals.paymentMethod) {
    const hashed = hashValue(signals.paymentMethod);
    addUnique(sig.paymentMethods, hashed);
    const result = await detectSharedSignal(userId, "payment", hashed, "paymentMethods");
    edgesCreated += result.edges;
    riskIncrease += result.risk;
  }

  // ── City ──
  if (signals.city) {
    const normalised = signals.city.trim().toLowerCase();
    addUnique(sig.citiesPosted, normalised);
  }

  sig.lastUpdatedAt = new Date();
  await sig.save();

  // Apply aggregate risk if edges were created
  if (riskIncrease > 0) {
    await addRiskPoints(userId, riskIncrease, "NETWORK_SIGNAL_DETECTED", `${edgesCreated} edge(s) created`);
  }

  return { edgesCreated, riskIncrease };
}

// ── Shared Signal Detection ────────────────────────────────

/**
 * Check if a signal value exists in any other user's AdvertiserSignal.
 * If found, create an edge and return risk points.
 */
async function detectSharedSignal(
  userId: string,
  signalType: EdgeSignalType,
  value: string,
  field: string
): Promise<{ edges: number; risk: number }> {
  // Find other users with this same signal
  const matches = await AdvertiserSignal.find({
    userId: { $ne: userId },
    [field]: value,
  })
    .select("userId")
    .lean();

  if (matches.length === 0) return { edges: 0, risk: 0 };

  let edges = 0;
  const strength = SIGNAL_STRENGTH[signalType] || 50;

  for (const match of matches) {
    const created = await createEdge(userId, String(match.userId), signalType, value, strength);
    if (created) edges++;
  }

  // Risk: stronger for high-confidence signals
  const riskPerEdge = signalType === "ip_subnet" ? 5 : 15;
  const risk = edges * riskPerEdge;

  if (edges > 0) {
    logWarn(`[Signal] ${signalType} shared: user ${userId} linked to ${edges} other account(s)`);

    await AuditLog.log("PATTERN_DETECTED", {
      userId: new mongoose.Types.ObjectId(userId),
      severity: edges >= 3 ? "critical" : "warning",
      reason: `Shared ${signalType} detected`,
      metadata: { signalType, matchCount: edges, value: signalType === "ip_subnet" ? value : "(redacted)" },
      isSystem: true,
    });
  }

  return { edges, risk };
}

/**
 * Image-specific signal detection using perceptual hashes.
 * Uses hamming distance for fuzzy matching.
 */
async function detectSharedImageSignals(
  userId: string,
  newHashes: string[]
): Promise<{ edges: number; risk: number }> {
  const { findSimilarImages } = await import("./imageHashService");

  const matches = await findSimilarImages(newHashes, userId);

  if (matches.length === 0) return { edges: 0, risk: 0 };

  let edges = 0;
  const seenUsers = new Set<string>();

  for (const match of matches) {
    if (seenUsers.has(match.userId)) continue;
    seenUsers.add(match.userId);

    const created = await createEdge(userId, match.userId, "image", match.matchedHash, SIGNAL_STRENGTH.image);
    if (created) edges++;
  }

  const risk = edges * 20; // Image reuse is a strong signal

  if (edges > 0) {
    logWarn(`[Signal] Image similarity: user ${userId} shares images with ${edges} account(s)`);

    await AuditLog.log("IMAGE_REUSE_DETECTED", {
      userId: new mongoose.Types.ObjectId(userId),
      severity: edges >= 3 ? "critical" : "warning",
      reason: `Perceptual image match across ${edges} account(s)`,
      metadata: { matchCount: edges, distances: matches.map((m) => m.distance) },
      isSystem: true,
    });
  }

  return { edges, risk };
}

// ── Edge Management ────────────────────────────────────────

/**
 * Create an edge between two users. Returns true if a new edge was created.
 * Canonicalises direction so A→B and B→A don't create duplicates.
 */
async function createEdge(
  userIdA: string,
  userIdB: string,
  signalType: EdgeSignalType,
  signalValue: string,
  strength: number
): Promise<boolean> {
  // Canonical ordering: smaller ObjectId first
  const [a, b] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

  try {
    const result = await AdvertiserEdge.updateOne(
      {
        userA: new mongoose.Types.ObjectId(a),
        userB: new mongoose.Types.ObjectId(b),
        signalType,
        signalValue,
      },
      {
        $set: { lastSeenAt: new Date(), strength },
        $setOnInsert: { detectedAt: new Date() },
      },
      { upsert: true }
    );

    // Only count as new edge if an upsert actually inserted a new document
    return result.upsertedCount > 0;
  } catch (err: any) {
    // Duplicate key = edge already exists
    if (err.code === 11000) return false;
    logWarn(`[Signal] Edge creation failed: ${err.message}`);
    return false;
  }
}

/**
 * Generate a device fingerprint hash from request headers.
 * Call this from auth/login middleware.
 */
export function generateDeviceFingerprint(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}): string {
  const ua = String(req.headers["user-agent"] || "");
  const lang = String(req.headers["accept-language"] || "");
  const encoding = String(req.headers["accept-encoding"] || "");

  const raw = `${ua}|${lang}|${encoding}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}
