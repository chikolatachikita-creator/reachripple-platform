/**
 * Upload Service — Cloudinary, S3, or Local Disk
 *
 * Priority: Cloudinary (if CLOUDINARY_CLOUD_NAME set) → S3 (if AWS_S3_BUCKET set) → Local disk
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand }  from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import multer, { StorageEngine } from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import logger from "../utils/logger";
import { optimizeImageBuffer, optimizeImageOnDisk } from "./imageService";

// ── Cloudinary Configuration ───────────────────────────────────
const CLOUDINARY_CLOUD   = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_KEY     = process.env.CLOUDINARY_API_KEY    || "";
const CLOUDINARY_SECRET  = process.env.CLOUDINARY_API_SECRET || "";

export const isCloudinaryEnabled = Boolean(CLOUDINARY_CLOUD && CLOUDINARY_KEY && CLOUDINARY_SECRET);

if (isCloudinaryEnabled) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD,
    api_key:    CLOUDINARY_KEY,
    api_secret: CLOUDINARY_SECRET,
    secure:     true,
  });
  logger.info("Cloudinary configured for image uploads");
}

// ── S3 Configuration ──────────────────────────────────────────
const S3_BUCKET   = process.env.AWS_S3_BUCKET   || "";
const S3_REGION   = process.env.AWS_REGION       || "eu-west-2";
const S3_KEY      = process.env.AWS_ACCESS_KEY_ID     || "";
const S3_SECRET   = process.env.AWS_SECRET_ACCESS_KEY || "";
const CDN_URL     = process.env.CDN_URL || "";          // optional CloudFront / custom domain

export const isS3Enabled = !isCloudinaryEnabled && Boolean(S3_BUCKET && S3_KEY && S3_SECRET);

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
  // Cloudinary public_id — construct URL
  if (isCloudinaryEnabled && !key.startsWith("/uploads")) {
    return cloudinary.url(key, { secure: true });
  }
  // S3 key
  if (isS3Enabled && !key.startsWith("/uploads")) {
    if (CDN_URL) return `${CDN_URL}/${key}`;
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
  }
  // Local path — return as-is (served by express.static)
  return key;
}

// ── Cloudinary operations ──────────────────────────────────────
/**
 * Upload a buffer to Cloudinary and return the secure URL.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  originalName: string,
  folder = "uploads"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `reachripple/${folder}`,
        resource_type: "auto",
        format: "webp",
        quality: "auto:good",
        transformation: [{ width: 1200, crop: "limit" }],
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Cloudinary upload failed"));
        logger.info(`Uploaded to Cloudinary: ${result.secure_url}`);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Upload a buffer to Cloudinary as a thumbnail.
 */
export async function uploadThumbnailToCloudinary(
  buffer: Buffer,
  folder = "uploads"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `reachripple/${folder}/thumbnails`,
        resource_type: "image",
        format: "webp",
        quality: "auto:eco",
        transformation: [{ width: 300, height: 300, crop: "fill" }],
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Cloudinary thumbnail upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by URL or public_id.
 */
export async function deleteFromCloudinary(urlOrId: string): Promise<void> {
  if (!urlOrId || urlOrId.startsWith("/uploads")) return;
  try {
    // Extract public_id from URL if needed
    let publicId = urlOrId;
    if (urlOrId.includes("cloudinary.com")) {
      const match = urlOrId.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
      if (match) publicId = match[1];
    }
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted from Cloudinary: ${publicId}`);
  } catch (err) {
    logger.warn("Cloudinary delete failed", err);
  }
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

// When S3 or Cloudinary is enabled we store to memory and push in the route handler
export const memoryStorage: StorageEngine = multer.memoryStorage();

/**
 * Choose storage engine based on cloud availability.
 */
export function getAdStorage(): StorageEngine {
  return (isCloudinaryEnabled || isS3Enabled) ? memoryStorage : localDiskStorage;
}

export function getVerificationStorage(): StorageEngine {
  return (isCloudinaryEnabled || isS3Enabled) ? memoryStorage : localVerifyStorage;
}

// ── Post-upload helper (call after multer) ─────────────────────
/**
 * Process uploaded files: Cloudinary → S3 → local disk.
 *
 * Images are automatically optimized (resized + WebP) via Sharp or Cloudinary transforms.
 */
export async function processUploadedFiles(
  files: Express.Multer.File[],
  folder = "uploads"
): Promise<string[]> {
  // Cloudinary mode — upload buffers directly (Cloudinary handles optimization)
  if (isCloudinaryEnabled) {
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadToCloudinary(file.buffer, file.originalname, folder);
      // Also upload a thumbnail
      await uploadThumbnailToCloudinary(file.buffer, folder);
      urls.push(url);
    }
    return urls;
  }

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
