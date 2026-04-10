import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import User from "../models/User";
import auth from "../middleware/auth";
import admin from "../middleware/admin";
import logger from "../utils/logger";
import { getVerificationStorage, processUploadedFiles } from "../services/uploadService";

const router = Router();

// Multer config for ID document uploads — S3 or local
const upload = multer({
  storage: getVerificationStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and PDF files are accepted"));
    }
  },
});

// GET /api/verification/status — Get current user's verification status
router.get("/status", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await User.findById(userId).select(
      "idVerificationStatus idVerifiedAt"
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      idVerificationStatus: user.idVerificationStatus,
      idVerifiedAt: user.idVerifiedAt || null,
    });
  } catch (err) {
    logger.error("Verification status error:", err);
    res.status(500).json({ error: "Failed to fetch verification status" });
  }
});

// POST /api/verification/request — Submit ID for verification
router.post(
  "/request",
  auth,
  upload.single("idDocument"),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await User.findById(userId);

      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.idVerificationStatus === "verified") {
        return res.status(400).json({ error: "Your ID is already verified" });
      }

      if (user.idVerificationStatus === "pending") {
        return res.status(400).json({
          error: "You already have a pending verification request. Please wait for admin review.",
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: "ID document is required. Please upload a JPG, PNG, or PDF." });
      }

      // Store path: S3 key or local /uploads/ path
      const [docPath] = await processUploadedFiles([req.file], "uploads/verification");

      user.idVerificationStatus = "pending";
      user.idVerificationDoc = docPath;
      await user.save();

      logger.info(
        `Verification request submitted by user ${userId} (${user.email})`
      );

      res.status(200).json({
        message: "Verification request submitted successfully. You will be notified once reviewed.",
        idVerificationStatus: "pending",
      });
    } catch (err) {
      logger.error("Verification request error:", err);
      res.status(500).json({ error: "Failed to submit verification request" });
    }
  }
);

// ─── Admin Routes ──────────────────────────────────────────────

// GET /api/verification/pending — List all pending verification requests (admin)
router.get("/pending", auth, admin, async (_req: Request, res: Response) => {
  try {
    const pending = await User.find({ idVerificationStatus: "pending" })
      .select("name email idVerificationStatus idVerificationDoc createdAt")
      .sort({ createdAt: 1 });
    res.json(pending);
  } catch (err) {
    logger.error("Fetch pending verifications error:", err);
    res.status(500).json({ error: "Failed to fetch pending verifications" });
  }
});

// PUT /api/verification/:userId/approve — Approve a user's ID (admin)
router.put("/:userId/approve", auth, admin, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.idVerificationStatus !== "pending") {
      return res.status(400).json({ error: "No pending verification for this user" });
    }

    user.idVerificationStatus = "verified";
    user.idVerifiedAt = new Date();
    user.idVerifiedBy = (req as any).userId;
    await user.save();

    // Also set isVerified flag on user's ads
    const Ad = (await import("../models/Ad")).default;
    await Ad.updateMany({ userId: user._id }, { isVerified: true });

    // Real-time notification
    const { notifyVerificationApproved } = await import("../services/notificationService");
    notifyVerificationApproved(user._id.toString()).catch(() => {});

    logger.info(`Verification approved for ${user.email} by admin ${(req as any).userId}`);
    res.json({ message: "Verification approved", idVerificationStatus: "verified" });
  } catch (err) {
    logger.error("Verification approve error:", err);
    res.status(500).json({ error: "Failed to approve verification" });
  }
});

// PUT /api/verification/:userId/reject — Reject a user's ID (admin)
router.put("/:userId/reject", auth, admin, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.idVerificationStatus !== "pending") {
      return res.status(400).json({ error: "No pending verification for this user" });
    }

    user.idVerificationStatus = "rejected";
    user.idVerificationDoc = undefined;
    await user.save();

    // Real-time notification
    const { notifyVerificationRejected } = await import("../services/notificationService");
    notifyVerificationRejected(user._id.toString(), req.body.reason).catch(() => {});

    logger.info(`Verification rejected for ${user.email} by admin ${(req as any).userId}`);
    res.json({ message: "Verification rejected", idVerificationStatus: "rejected" });
  } catch (err) {
    logger.error("Verification reject error:", err);
    res.status(500).json({ error: "Failed to reject verification" });
  }
});

export default router;
