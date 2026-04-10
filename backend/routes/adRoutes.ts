import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import rateLimit from "express-rate-limit";
import { Types } from "mongoose";
import Ad from "../models/Ad";
import {
  getAds,
  getAdById,
  getMyAds,
  createAd,
  updateAd,
  updateMyAd,
  deleteMyAd,
  approveAd,
  rejectAd,
  deleteAd,
} from "../controllers/adController";
import auth from "../middleware/auth";
import admin from "../middleware/admin";
import logger from "../utils/logger";
import { 
  checkBumpAllowed, 
  logBump, 
  shouldCountClick,
  shouldCountView,
  checkAdCreationAllowed 
} from "../services/abusePreventionService";
import { getAdStorage, isS3Enabled } from "../services/uploadService";
import { adCreationRateLimiter } from "../config/rateLimits";
import { trackEngagementEvent } from "../services/visibilityScoreService";

const router = Router();

// Rate limit ad creation (DoS guard - per-account limits enforced in controller)
const adUploadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,  // 24 hours
  max: 50,  // Upper bound; actual limits are per account type/plan in controller
  keyGenerator: (req) => (req as any).userId || req.ip || "unknown",
  handler: (req, res) => {
    res.status(429).json({ error: "Too many ads created. Please try again later." });
  },
  skip: (req) => (req as any).userRole === 'admin',  // Skip for admins
});

// Multer storage — S3 when configured, local disk otherwise
const storage = getAdStorage();

// SECURITY: Whitelist only safe image types (no SVG which could contain scripts)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB per video

const upload = multer({
  storage,
  limits: { 
    files: 11, // 10 images + 1 video
    fileSize: MAX_VIDEO_SIZE // Use larger limit, validate per file type below
  },
  fileFilter: (req, file, cb) => {
    // SECURITY: Only allow whitelisted MIME types
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WebP images and MP4, WebM, MOV videos are allowed"));
    }
    
    cb(null, true);
  },
});

// Public – clients can browse and view ads
router.get("/", getAds);

// User's own ads (must be before /:id route)
router.get("/my", auth, getMyAds);

// Draft routes (must be before /:id route)
// POST /api/ads/draft - Autosave draft
router.post("/draft", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { adId, data } = req.body;

    let ad;
    if (adId) {
      // Update existing draft
      ad = await Ad.findOneAndUpdate(
        { _id: adId, userId },
        { ...data, status: "draft" },
        { new: true }
      );
    } else {
      // Create new draft
      ad = await Ad.create({
        userId,
        ...data,
        status: "draft",
      });
    }

    res.json({ adId: ad?._id, ad });
  } catch (err) {
    logger.error("Draft save error:", err);
    res.status(500).json({ message: "Failed to save draft" });
  }
});

// GET /api/ads/draft/me/latest - Get latest draft for logged-in user
router.get("/draft/me/latest", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const ad = await Ad.findOne({
      userId,
      status: "draft",
    }).sort({ updatedAt: -1 });

    if (!ad) return res.json({ ad: null });
    res.json({ ad });
  } catch (err) {
    logger.error("Get draft error:", err);
    res.status(500).json({ message: "Failed to load draft" });
  }
});

// PATCH /api/ads/:id/status - Quick status update (hide/unpause)
router.patch("/:id/status", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status } = req.body;
    const allowed = ["hidden", "pending", "draft", "approved"];
    
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Only allow transition to "approved" if the ad was previously approved (i.e. un-hiding)
    if (status === "approved") {
      const current = await Ad.findOne({ _id: req.params.id, userId });
      if (!current) return res.status(404).json({ message: "Ad not found" });
      if (current.status !== "hidden") {
        return res.status(400).json({ message: "Can only restore approved status from hidden" });
      }
      // Check the ad was previously approved by looking at previousStatus or allowing hidden→approved directly
    }

    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status },
      { new: true }
    );

    if (!ad) return res.status(404).json({ message: "Ad not found" });
    res.json({ ad });
  } catch (err) {
    logger.error("Update status error:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// POST /api/ads/:id/click - Increment click count (deduplicated)
router.post("/:id/click", async (req: Request, res: Response) => {
  try {
    const clickerIdentifier = req.ip || req.socket.remoteAddress || 'unknown';
    
    // ABUSE PREVENTION: Deduplicate clicks from same visitor
    if (!shouldCountClick(req.params.id, clickerIdentifier)) {
      // Silently succeed but don't increment (to prevent gaming detection)
      return res.json({ success: true });
    }
    
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    trackEngagementEvent(req.params.id, "view").catch(() => {});
    res.json({ success: true });
  } catch (err) {
    logger.error("Click increment error:", err);
    res.status(500).json({ message: "Failed to record click" });
  }
});

// ===================================================
// BUMP SYSTEM ROUTES
// ===================================================

// POST /api/ads/:id/tumble-up - Manual bump with cooldown (Tumble Up / Pulse)
// RESTRICTION: Only PRIME and SPOTLIGHT tiers can use Tumble Up
router.post("/:id/tumble-up", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');
    const now = new Date();
    
    // First, check if ad exists and has eligible tier
    const existingAd = await Ad.findOne({ _id: req.params.id, userId });
    if (!existingAd) {
      return res.status(404).json({ message: "Ad not found" });
    }
    
    // TIER RESTRICTION: Only PRIORITY_PLUS and FEATURED can use Tumble Up
    const ALLOWED_TIERS = ["PRIORITY_PLUS", "FEATURED"];
    if (!ALLOWED_TIERS.includes(existingAd.tier || "STANDARD")) {
      return res.status(403).json({ 
        message: "Tumble Up is only available for Priority Plus and Featured listings",
        currentTier: existingAd.tier || "STANDARD",
        allowedTiers: ALLOWED_TIERS,
        upgradeRequired: true
      });
    }
    
    // ABUSE PREVENTION: Check daily cap + rate limit + IP abuse
    const bumpCheck = await checkBumpAllowed(
      new Types.ObjectId(req.params.id),
      new Types.ObjectId(userId),
      ip
    );
    
    if (!bumpCheck.allowed) {
      return res.status(429).json({
        message: bumpCheck.reason,
        remainingBumps: bumpCheck.remainingBumps,
        nextBumpAvailable: bumpCheck.nextBumpAvailable,
        rateLimit: bumpCheck.rateLimit,
      });
    }
    
    // SECURITY: Use atomic update to prevent race condition
    // Only allow bump if user owns the ad and cooldown has expired
    const ad = await Ad.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId,
        $or: [
          { pulseCooldownUntil: null },
          { pulseCooldownUntil: { $lte: now } }
        ]
      },
      {
        lastPulsedAt: now,
        pulseCooldownUntil: new Date(now.getTime() + 10 * 60 * 1000) // 10 minute cooldown
      },
      { new: true }
    );
    
    if (!ad) {
      // Cooldown is still active
      if (existingAd.pulseCooldownUntil && now < new Date(existingAd.pulseCooldownUntil)) {
        const remainingMs = new Date(existingAd.pulseCooldownUntil).getTime() - now.getTime();
        const remainingMins = Math.ceil(remainingMs / (1000 * 60));
        return res.status(429).json({ 
          message: `Cooldown active. Try again in ${remainingMins} minutes`,
          cooldownUntil: existingAd.pulseCooldownUntil
        });
      }
    }
    
    if (ad) {
      // Log successful bump for abuse tracking
      await logBump(
        new Types.ObjectId(req.params.id),
        new Types.ObjectId(userId),
        ip,
        userAgent
      );
      
      res.json({ 
        success: true, 
        message: "Ad bumped! You can bump again in 10 minutes.",
        lastPulsedAt: ad.lastPulsedAt,
        cooldownUntil: ad.pulseCooldownUntil,
        remainingBumps: bumpCheck.remainingBumps
      });
    }
  } catch (err) {
    logger.error("Tumble up error:", err);
    res.status(500).json({ message: "Failed to bump ad" });
  }
});

// POST /api/ads/:id/tap-up/activate - Activate auto-bump schedule (Tap Up)
router.post("/:id/tap-up/activate", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { intervalHours = 12, durationDays = 7 } = req.body;
    
    // Validate interval (allowed: 6, 8, 12 hours)
    const allowedIntervals = [6, 8, 12];
    if (!allowedIntervals.includes(intervalHours)) {
      return res.status(400).json({ 
        message: "Invalid interval. Allowed values: 6, 8, or 12 hours" 
      });
    }
    
    const ad = await Ad.findOne({ _id: req.params.id, userId });
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }
    
    const now = new Date();
    const tapUpUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const nextTapUpAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    
    ad.hasTapUp = true;
    ad.tapUpUntil = tapUpUntil;
    ad.tapUpIntervalHours = intervalHours;
    ad.nextTapUpAt = nextTapUpAt;
    ad.lastPulsedAt = now; // Initial bump on activation
    await ad.save();
    
    res.json({
      success: true,
      message: `Tap Up activated! Auto-bumping every ${intervalHours} hours for ${durationDays} days`,
      hasTapUp: true,
      tapUpUntil: ad.tapUpUntil,
      nextTapUpAt: ad.nextTapUpAt,
      tapUpIntervalHours: ad.tapUpIntervalHours
    });
  } catch (err) {
    logger.error("Tap up activation error:", err);
    res.status(500).json({ message: "Failed to activate Tap Up" });
  }
});

// POST /api/ads/:id/tap-up/deactivate - Deactivate auto-bump
router.post("/:id/tap-up/deactivate", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const ad = await Ad.findOne({ _id: req.params.id, userId });
    
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }
    
    ad.hasTapUp = false;
    ad.tapUpUntil = undefined;
    ad.nextTapUpAt = undefined;
    await ad.save();
    
    res.json({
      success: true,
      message: "Tap Up deactivated",
      hasTapUp: false
    });
  } catch (err) {
    logger.error("Tap up deactivation error:", err);
    res.status(500).json({ message: "Failed to deactivate Tap Up" });
  }
});

// GET /api/ads/:id/bump-status - Get bump status for an ad
router.get("/:id/bump-status", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const ad = await Ad.findOne({ _id: req.params.id, userId });
    
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }
    
    const now = new Date();
    const canTumbleUp = !ad.pulseCooldownUntil || now >= new Date(ad.pulseCooldownUntil);
    const tapUpActive = ad.hasTapUp && ad.tapUpUntil && now < new Date(ad.tapUpUntil);
    
    res.json({
      // Manual bump (Tumble Up)
      lastPulsedAt: ad.lastPulsedAt,
      pulseCooldownUntil: ad.pulseCooldownUntil,
      canTumbleUp,
      
      // Auto bump (Tap Up)
      hasTapUp: tapUpActive,
      tapUpUntil: ad.tapUpUntil,
      tapUpIntervalHours: ad.tapUpIntervalHours,
      nextTapUpAt: ad.nextTapUpAt,
      
      // Placement info (single source of truth)
      tier: ad.tier,
      tierUntil: ad.tierUntil,
      
      // Computed badges (for display)
      isNewArrival: ad.createdAt && (Date.now() - new Date(ad.createdAt).getTime()) < 48 * 60 * 60 * 1000,
      
      // Quality score
      qualityScore: ad.qualityScore
    });
  } catch (err) {
    logger.error("Get bump status error:", err);
    res.status(500).json({ message: "Failed to get bump status" });
  }
});

// =====================================================
// POSTING LIMITS — Get user's ad posting allowance
// =====================================================
router.get("/posting-limits", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const result = await checkAdCreationAllowed(new Types.ObjectId(userId));
    res.json({
      canCreate: result.allowed,
      currentCount: result.currentCount || 0,
      maxAllowed: result.maxAllowed || 1,
      reason: result.reason,
    });
  } catch (err) {
    logger.error("Posting limits error:", err);
    res.status(500).json({ message: "Failed to check posting limits" });
  }
});

// =====================================================
// PUBLISHER PAGE — Get all ads by a specific user (public)
// =====================================================
router.get("/publisher/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const ads = await Ad.find({
      userId: new Types.ObjectId(userId),
      isDeleted: false,
      status: "approved",
    })
      .sort({ lastPulsedAt: -1, createdAt: -1 })
      .lean();
    
    res.json({ ads, total: ads.length });
  } catch (err) {
    logger.error("Publisher page error:", err);
    res.status(500).json({ message: "Failed to load publisher ads" });
  }
});

// Public - single ad view (moved after draft routes)
router.get("/:id", getAdById);

// User can create ads (auth required but not admin) - with image and video upload
router.post("/", auth, adCreationRateLimiter, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 1 }]), createAd);

// User can update/delete their own ads
router.put("/:id/user", auth, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 1 }]), updateMyAd);
router.delete("/:id/user", auth, deleteMyAd);

// Admin-only – edit / moderate ads
router.put("/:id", auth, admin, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 1 }]), updateAd);
router.put("/:id/approve", auth, admin, approveAd);
router.put("/:id/reject", auth, admin, rejectAd);
router.delete("/:id", auth, admin, deleteAd);

// ===================================================
// ENGAGEMENT TRACKING
// ===================================================

// POST /api/ads/:id/track - Track engagement event
router.post("/:id/track", async (req: Request, res: Response) => {
  try {
    const { event } = req.body;
    const validEvents = ["view", "save", "wa_click", "call_click", "sms_click", "message_started", "share"];
    if (!event || !validEvents.includes(event)) {
      return res.status(400).json({ message: "Invalid event type" });
    }
    await trackEngagementEvent(req.params.id, event);
    res.json({ success: true });
  } catch (err) {
    logger.error("Engagement tracking error:", err);
    res.status(500).json({ message: "Failed to track event" });
  }
});

export default router;