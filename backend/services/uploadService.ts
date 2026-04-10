/**
 * Upload Service — S3 or Local Disk
 *
 * When AWS_S3_BUCKET is set in env, uploads go to S3.
 * Otherwise falls back to local disk (dev mode).
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand }  from "@aws-sdk/client-s3";
import multer, { StorageEngine } from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import logger from "../utils/logger";
import { optimizeImageBuffer, optimizeImageOnDisk } from "./imageService";

// ── Configuration ──────────────────────────────────────────────
const S3_BUCKET   = process.env.AWS_S3_BUCKET   || "";
const S3_REGION   = process.env.AWS_REGION       || "eu-west-2";
const S3_KEY      = process.env.AWS_ACCESS_KEY_ID     || "";
const S3_SECRET   = process.env.AWS_SECRET_ACCESS_KEY || "";
const CDN_URL     = process.env.CDN_URL || "";          // optional CloudFront / custom domain

export const isS3Enabled = Boolean(S3_BUCKET && S3_KEY && S3_SECRET);

// ── S3 client (lazy) ───────────────────────────────────────────
let s3: S3Client | null = null;

function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: S3_REGION,
      credentials: { accessKeyId: S3_KEY, secretAccessKey: S3_SECRET },
    });
  }
  return s3;
}

// ── Helpers ────────────────────────────────────────────────────
function uniqueName(original: string): string {
  const ext  = path.extname(original).toLowerCase();
  const hash = crypto.randomBytes(8).toString("hex");
  return `${Date.now()}-${hash}${ext}`;
}

/**
 * Return the public URL for a stored file.
 * S3 mode  → https://<bucket>.s3.<region>.amazonaws.com/<key>  (or CDN)
 * Local    → /uploads/<filename>
 */
export function fileUrl(key: string): string {
  if (!key) return "";
  // Already a full URL (migrated or external)
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  // S3 key
  if (isS3Enabled && !key.startsWith("/uploads")) {
    if (CDN_URL) return `${CDN_URL}/${key}`;
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
  }
  // Local path — return as-is (served by express.static)
  return key;
}

// ── S3 operations ──────────────────────────────────────────────
/**
 * Upload a buffer to S3 and return the object key.
 */
export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  folder = "uploads"
): Promise<string> {
  const key = `${folder}/${uniqueName(originalName)}`;
  await getS3().send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  logger.info(`Uploaded to S3: ${key}`);
  return key;
}

/**
 * Delete an object from S3 by key.
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!key || key.startsWith("/uploads")) return; // local file, skip
  try {
    await getS3().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    logger.info(`Deleted from S3: ${key}`);
  } catch (err) {
    logger.warn("S3 delete failed", err);
  }
}

// ── Multer storage (local disk, used when S3 is disabled) ──────
const LOCAL_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
const LOCAL_VERIFY_DIR = path.join(LOCAL_UPLOAD_DIR, "verification");

// Ensure directories exist
[LOCAL_UPLOAD_DIR, LOCAL_VERIFY_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

export const localDiskStorage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOCAL_UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, uniqueName(file.originalname)),
});

export const localVerifyStorage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOCAL_VERIFY_DIR),
  filename: (_req, file, cb) => cb(null, `id-${uniqueName(file.originalname)}`),
});

// When S3 is enabled we store to memory and push to S3 in the route handler
export const memoryStorage: StorageEngine = multer.memoryStorage();

/**
 * Choose storage engine based on S3 availability.
 */
export function getAdStorage(): StorageEngine {
  return isS3Enabled ? memoryStorage : localDiskStorage;
}

export function getVerificationStorage(): StorageEngine {
  return isS3Enabled ? memoryStorage : localVerifyStorage;
}

// ── Post-upload helper (call after multer) ─────────────────────
/**
 * Process uploaded files: if S3 is enabled, push them to S3 and
 * return S3 keys. Otherwise return local /uploads/ paths.
 *
 * Images are automatically optimized (resized + WebP) via Sharp.
 */
export async function processUploadedFiles(
  files: Express.Multer.File[],
  folder = "uploads"
): Promise<string[]> {
  if (!isS3Enabled) {
    // Local mode — files already on disk; run Sharp optimization
    const paths: string[] = [];
    for (const f of files) {
      const result = await optimizeImageOnDisk(`/uploads/${f.filename}`, f.filename);
      if (result) {
        paths.push(result.image); // optimized WebP path
      } else {
        paths.push(`/uploads/${f.filename}`); // non-image or failed — keep original
      }
    }
    return paths;
  }

  // S3 mode — optimize buffers before uploading
  const keys: string[] = [];
  for (const file of files) {
    const optimized = await optimizeImageBuffer(file.buffer, file.mimetype);
    if (optimized) {
      // Upload optimized image
      const webpName = file.originalname.replace(/\.[^.]+$/, ".webp");
      const key = await uploadToS3(optimized.imageBuffer, webpName, optimized.imageMime, folder);
      // Upload thumbnail
      await uploadToS3(optimized.thumbBuffer, `thumb-${webpName}`, optimized.thumbMime, `${folder}/thumbnails`);
      keys.push(key);
    } else {
      // Non-image or optimization failed — upload as-is
      const key = await uploadToS3(file.buffer, file.originalname, file.mimetype, folder);
      keys.push(key);
    }
  }
  return keys;
}
