import { Router, Request, Response } from "express";
import sharp from "sharp";
import logger from "../utils/logger";

const router = Router();

/**
 * Image proxy + resizer.
 *
 *   GET /api/img?u=<encoded-url>&w=600&fmt=webp
 *
 * - Validates the source host against an allow-list (kills SSRF + arbitrary
 *   third-party hot-linking).
 * - Fetches the image server-side, pipes it through sharp to resize and
 *   re-encode as WebP (or jpeg if explicitly requested), then streams it
 *   back with long cache headers.
 * - On any failure (timeout, 4xx/5xx upstream, unsupported format) returns
 *   HTTP 302 to /placeholder-profile.svg so callers never see a broken icon.
 *
 * Allow-list intentionally narrow. Add a host here when you need it.
 */
const ALLOWED_HOSTS = new Set([
  "images.unsplash.com",
  "plus.unsplash.com",
  "picsum.photos",
  "fastly.picsum.photos",
  "i.picsum.photos",
  "graph.facebook.com",
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "res.cloudinary.com",
  "reachripple-api.onrender.com",
]);

const MAX_WIDTH = 1600;
const FETCH_TIMEOUT_MS = 6000;
const PLACEHOLDER = "/placeholder-profile.svg";

router.get("/", async (req: Request, res: Response) => {
  const raw = String(req.query.u || "").trim();
  const w = Math.min(parseInt(String(req.query.w || "0"), 10) || 0, MAX_WIDTH);
  const fmt = String(req.query.fmt || "webp").toLowerCase();

  if (!raw) {
    return res.redirect(302, PLACEHOLDER);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return res.redirect(302, PLACEHOLDER);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return res.redirect(302, PLACEHOLDER);
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    return res.redirect(302, PLACEHOLDER);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "ReachRipple-ImageProxy/1.0" },
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.redirect(302, PLACEHOLDER);
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return res.redirect(302, PLACEHOLDER);
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    let pipeline = sharp(buf, { failOn: "none" }).rotate();
    if (w > 0) {
      pipeline = pipeline.resize({ width: w, withoutEnlargement: true });
    }
    if (fmt === "jpeg" || fmt === "jpg") {
      pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
      res.setHeader("Content-Type", "image/jpeg");
    } else {
      pipeline = pipeline.webp({ quality: 80 });
      res.setHeader("Content-Type", "image/webp");
    }

    const out = await pipeline.toBuffer();
    // Cache aggressively: image bytes addressed by full URL+w+fmt are immutable.
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(out);
  } catch (err: any) {
    clearTimeout(timeout);
    logger.warn("Image proxy failed", { url: url.toString(), err: err?.message });
    return res.redirect(302, PLACEHOLDER);
  }
});

export default router;
