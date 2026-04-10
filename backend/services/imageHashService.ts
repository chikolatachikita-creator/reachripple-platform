/**
 * Perceptual Image Hash Service
 *
 * Generates perceptual hashes (pHash) from actual image bytes using Sharp.
 * Unlike MD5-of-URL, this detects visually similar images even with
 * different filenames, resolutions, or minor edits.
 *
 * Algorithm: Resize to 8×8 greyscale → compute mean → generate 64-bit hash.
 * Two images with hamming distance ≤ 10 are considered a match.
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import logger from "../utils/logger";

const HASH_SIZE = 8; // 8×8 = 64-bit hash
const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");

/**
 * Generate a perceptual hash from a buffer.
 * Returns a 16-char hex string (64-bit hash).
 */
export async function pHashFromBuffer(buffer: Buffer): Promise<string | null> {
  try {
    // Resize to 8×8 greyscale
    const pixels = await sharp(buffer)
      .resize(HASH_SIZE, HASH_SIZE, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer();

    // Compute mean brightness
    let sum = 0;
    for (let i = 0; i < pixels.length; i++) {
      sum += pixels[i];
    }
    const mean = sum / pixels.length;

    // Build binary hash: each pixel above mean = 1, below = 0
    let hashBits = "";
    for (let i = 0; i < pixels.length; i++) {
      hashBits += pixels[i] >= mean ? "1" : "0";
    }

    // Convert 64-bit binary string to 16-char hex
    const hashHex = BigInt("0b" + hashBits).toString(16).padStart(16, "0");
    return hashHex;
  } catch (err: any) {
    logger.warn(`[pHash] Buffer hash failed: ${err.message}`);
    return null;
  }
}

/**
 * Generate a perceptual hash from a local file path.
 */
export async function pHashFromFile(filePath: string): Promise<string | null> {
  try {
    // Handle both full paths and /uploads/ relative paths
    let fullPath = filePath;
    if (filePath.startsWith("/uploads/")) {
      fullPath = path.join(UPLOADS_ROOT, filePath.replace("/uploads/", ""));
    }

    if (!fs.existsSync(fullPath)) {
      logger.warn(`[pHash] File not found: ${fullPath}`);
      return null;
    }

    const buffer = fs.readFileSync(fullPath);
    return pHashFromBuffer(buffer);
  } catch (err: any) {
    logger.warn(`[pHash] File hash failed: ${err.message}`);
    return null;
  }
}

/**
 * Compute hamming distance between two hex hash strings.
 * Lower = more similar. 0 = identical. ≤10 = likely same image.
 */
export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) return 64; // max distance

  const a = BigInt("0x" + hashA);
  const b = BigInt("0x" + hashB);
  let xor = a ^ b;
  let dist = 0;

  while (xor > 0n) {
    dist += Number(xor & 1n);
    xor >>= 1n;
  }

  return dist;
}

/**
 * Check if two hashes represent similar images.
 * threshold: max hamming distance (default 10 out of 64).
 */
export function isSimilar(hashA: string, hashB: string, threshold = 10): boolean {
  return hammingDistance(hashA, hashB) <= threshold;
}

/**
 * Generate hashes for multiple image buffers (from multer memory storage).
 */
export async function hashImageBuffers(
  files: { buffer: Buffer; mimetype: string }[]
): Promise<string[]> {
  const hashes: string[] = [];
  for (const file of files) {
    if (!/^image\//i.test(file.mimetype)) continue;
    const hash = await pHashFromBuffer(file.buffer);
    if (hash) hashes.push(hash);
  }
  return hashes;
}

/**
 * Generate hashes for images already on disk (local upload paths).
 */
export async function hashImagePaths(imagePaths: string[]): Promise<string[]> {
  const hashes: string[] = [];
  for (const p of imagePaths) {
    const hash = await pHashFromFile(p);
    if (hash) hashes.push(hash);
  }
  return hashes;
}

/**
 * Find similar images across all stored advertiser signals.
 * Returns list of matching user IDs and their similar hashes.
 */
export async function findSimilarImages(
  hashes: string[],
  excludeUserId: string
): Promise<{ userId: string; matchedHash: string; distance: number }[]> {
  // Import here to avoid circular dependency
  const { default: AdvertiserSignal } = await import("../models/AdvertiserSignal");

  const allSignals = await AdvertiserSignal.find({
    userId: { $ne: excludeUserId },
    imageHashes: { $exists: true, $ne: [] },
  })
    .select("userId imageHashes")
    .lean();

  const matches: { userId: string; matchedHash: string; distance: number }[] = [];

  for (const signal of allSignals) {
    for (const existingHash of signal.imageHashes) {
      for (const newHash of hashes) {
        const dist = hammingDistance(newHash, existingHash);
        if (dist <= 10) {
          matches.push({
            userId: String(signal.userId),
            matchedHash: existingHash,
            distance: dist,
          });
        }
      }
    }
  }

  return matches;
}
