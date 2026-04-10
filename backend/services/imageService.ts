/**
 * Image Optimization Service — Sharp
 *
 * Resizes uploaded images to sensible maximums, generates thumbnails,
 * and converts to WebP for smaller file sizes.
 *
 * Works for BOTH local disk and S3 flows:
 *   Local  → reads from disk, writes optimized + thumb back to disk
 *   S3     → processes buffer in-memory, returns { optimized, thumbnail } buffers
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";
import logger from "../utils/logger";

// ── Configuration ──────────────────────────────────────────────
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 400;
const QUALITY = 80;
const THUMB_QUALITY = 70;

const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
const THUMBS_DIR = path.join(UPLOADS_ROOT, "thumbnails");

// Ensure thumbnail directory exists
if (!fs.existsSync(THUMBS_DIR)) {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
}

// ── Types ──────────────────────────────────────────────────────
export interface OptimizedImageResult {
  /** Path or key for the main (resized) image */
  image: string;
  /** Path or key for the thumbnail */
  thumbnail: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Optimized file size in bytes */
  optimizedSize: number;
}

export interface OptimizedBufferResult {
  imageBuffer: Buffer;
  imageMime: string;
  thumbBuffer: Buffer;
  thumbMime: string;
  originalSize: number;
  optimizedSize: number;
}

// ── Helpers ────────────────────────────────────────────────────
function isImage(mimetype: string): boolean {
  return /^image\/(jpeg|jpg|png|webp|gif|avif|tiff|bmp)$/i.test(mimetype);
}

// ── Buffer-based processing (for S3 / in-memory multer) ────────
/**
 * Optimize an image buffer: resize to max dimensions, convert to WebP,
 * and generate a thumbnail buffer.
 */
export async function optimizeImageBuffer(
  buffer: Buffer,
  mimetype: string
): Promise<OptimizedBufferResult | null> {
  if (!isImage(mimetype)) return null;

  const originalSize = buffer.length;

  try {
    // Main image — resize + WebP
    const imageBuffer = await sharp(buffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    // Thumbnail — small square crop + WebP
    const thumbBuffer = await sharp(buffer)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover" })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    return {
      imageBuffer,
      imageMime: "image/webp",
      thumbBuffer,
      thumbMime: "image/webp",
      originalSize,
      optimizedSize: imageBuffer.length,
    };
  } catch (err: any) {
    logger.warn(`Image optimization failed, using original: ${err.message}`);
    return null;
  }
}

// ── Disk-based processing (for local multer storage) ───────────
/**
 * Optimize an image already saved to local disk.
 * Overwrites the original with the optimized version and creates a thumbnail.
 */
export async function optimizeImageOnDisk(
  filePath: string,
  filename: string
): Promise<OptimizedImageResult | null> {
  const ext = path.extname(filename).toLowerCase();
  const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tiff", ".bmp"];
  if (!imageExts.includes(ext)) return null;

  const fullPath = path.join(UPLOADS_ROOT, filename);
  if (!fs.existsSync(fullPath)) return null;

  try {
    const originalBuffer = fs.readFileSync(fullPath);
    const originalSize = originalBuffer.length;

    // Optimized image — overwrite in-place as WebP
    const webpName = filename.replace(/\.[^.]+$/, ".webp");
    const webpPath = path.join(UPLOADS_ROOT, webpName);

    const optimizedBuffer = await sharp(originalBuffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    fs.writeFileSync(webpPath, optimizedBuffer);

    // Remove original if it was a different format
    if (webpName !== filename && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Thumbnail
    const thumbName = `thumb-${webpName}`;
    const thumbPath = path.join(THUMBS_DIR, thumbName);

    const thumbBuffer = await sharp(originalBuffer)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover" })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    fs.writeFileSync(thumbPath, thumbBuffer);

    const savedBytes = originalSize - optimizedBuffer.length;
    if (savedBytes > 0) {
      logger.info(`[Sharp] Optimized ${filename}: ${(originalSize / 1024).toFixed(0)}KB → ${(optimizedBuffer.length / 1024).toFixed(0)}KB (saved ${(savedBytes / 1024).toFixed(0)}KB)`);
    }

    return {
      image: `/uploads/${webpName}`,
      thumbnail: `/uploads/thumbnails/${thumbName}`,
      originalSize,
      optimizedSize: optimizedBuffer.length,
    };
  } catch (err: any) {
    logger.warn(`[Sharp] Failed to optimize ${filename}: ${err.message}`);
    return null;
  }
}
