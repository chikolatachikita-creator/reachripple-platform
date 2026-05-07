import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import User from "../models/User";
import auth from "../middleware/auth";
import admin from "../middleware/admin";
import logger from "../utils/logger";
import { getVerificationStorage, processUploadedFiles } from "../services/uploadService";

const router = Router();

// Multer config for agency KYC documents
const upload = multer({
  storage: getVerificationStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB per doc
  fileFilter: (_req, file, cb) => {
    const allowedExt = [".jpg", ".jpeg", ".png", ".pdf"];
    const allowedMime = ["image/jpeg", "image/png", "application/pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.includes(ext) && allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and PDF files are accepted"));
    }
  },
});

const kycFields = upload.fields([
  { name: "companyRegistrationDoc", maxCount: 1 },
  { name: "proofOfAddress", maxCount: 1 },
  { name: "directorIdDoc", maxCount: 1 },
]);

// GET /api/agency/me — current user's agency profile + verification status
router.get("/me", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await User.findById(userId).select(
      "name email accountType verificationStatus agencyDetails postingPlan accountTier"
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      accountType: user.accountType,
      verificationStatus: user.verificationStatus,
      agencyDetails: user.agencyDetails || null,
      postingPlan: user.postingPlan,
      accountTier: user.accountTier,
    });
  } catch (err) {
    logger.error("Agency me error:", err);
    res.status(500).json({ error: "Failed to fetch agency profile" });
  }
});

// POST /api/agency/upgrade — switch an individual account to agency
router.post("/upgrade", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { companyName, companyNumber, website, directorName, phone } = req.body as {
      companyName?: string;
      companyNumber?: string;
      website?: string;
      directorName?: string;
      phone?: string;
    };

    if (!companyName || companyName.trim().length < 2) {
      return res.status(400).json({ message: "Agency / business name is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.accountType === "agency") {
      return res.status(400).json({ message: "Account is already an agency" });
    }

    user.accountType = "agency";
    user.verificationStatus = "pending";
    user.agencyDetails = {
      ...(user.agencyDetails || {}),
      companyName: companyName.trim(),
      companyNumber: companyNumber?.trim() || undefined,
      website: website?.trim() || undefined,
      directorName: directorName?.trim() || undefined,
    };
    if (phone?.trim()) user.phone = phone.trim();
    await user.save();

    logger.info(`User ${user.email} upgraded to agency account`);
    res.json({
      message: "Account upgraded to agency. Complete KYC to get verified.",
      accountType: user.accountType,
      verificationStatus: user.verificationStatus,
      agencyDetails: user.agencyDetails,
    });
  } catch (err) {
    logger.error("Agency upgrade error:", err);
    res.status(500).json({ error: "Failed to upgrade account" });
  }
});

// PUT /api/agency/details — update agency-only details (must already be an agency)
router.put("/details", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.accountType !== "agency") {
      return res.status(400).json({ message: "Account is not an agency" });
    }

    const { companyName, companyNumber, vatNumber, directorName, registeredAddress, tradingAddress, website } = req.body || {};
    user.agencyDetails = {
      ...(user.agencyDetails || {}),
      ...(companyName !== undefined && { companyName: String(companyName).trim() }),
      ...(companyNumber !== undefined && { companyNumber: String(companyNumber).trim() }),
      ...(vatNumber !== undefined && { vatNumber: String(vatNumber).trim() }),
      ...(directorName !== undefined && { directorName: String(directorName).trim() }),
      ...(registeredAddress !== undefined && { registeredAddress: String(registeredAddress).trim() }),
      ...(tradingAddress !== undefined && { tradingAddress: String(tradingAddress).trim() }),
      ...(website !== undefined && { website: String(website).trim() }),
    };
    await user.save();
    res.json({ message: "Agency details updated", agencyDetails: user.agencyDetails });
  } catch (err) {
    logger.error("Agency details update error:", err);
    res.status(500).json({ error: "Failed to update agency details" });
  }
});

// POST /api/agency/kyc — upload one or more KYC documents
router.post("/kyc", auth, kycFields, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.accountType !== "agency") {
      return res.status(400).json({ message: "Only agency accounts can submit KYC" });
    }

    const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const updates: Record<string, string> = {};

    for (const field of ["companyRegistrationDoc", "proofOfAddress", "directorIdDoc"] as const) {
      const f = files[field]?.[0];
      if (f) {
        const [docPath] = await processUploadedFiles([f], "uploads/verification");
        updates[field] = docPath;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Upload at least one document" });
    }

    user.agencyDetails = { ...(user.agencyDetails || {}), ...updates };
    if (user.verificationStatus !== "verified") {
      user.verificationStatus = "pending";
    }
    await user.save();

    logger.info(`Agency KYC submitted by ${user.email}: ${Object.keys(updates).join(", ")}`);
    res.json({
      message: "KYC documents uploaded. Our team will review shortly.",
      verificationStatus: user.verificationStatus,
      agencyDetails: user.agencyDetails,
    });
  } catch (err) {
    logger.error("Agency KYC upload error:", err);
    res.status(500).json({ error: "Failed to upload KYC documents" });
  }
});

// ─── Admin Routes ──────────────────────────────────────────────

// GET /api/agency/admin/pending — list agencies awaiting verification
router.get("/admin/pending", auth, admin, async (_req: Request, res: Response) => {
  try {
    const pending = await User.find({
      accountType: "agency",
      verificationStatus: "pending",
    })
      .select("name email accountType verificationStatus agencyDetails phone createdAt")
      .sort({ createdAt: 1 });
    res.json(pending);
  } catch (err) {
    logger.error("Fetch pending agencies error:", err);
    res.status(500).json({ error: "Failed to fetch pending agencies" });
  }
});

// PUT /api/agency/admin/:userId/approve
router.put("/admin/:userId/approve", auth, admin, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.accountType !== "agency") {
      return res.status(400).json({ message: "User is not an agency" });
    }

    user.verificationStatus = "verified";
    user.agencyDetails = {
      ...(user.agencyDetails || {}),
      verifiedAt: new Date(),
      verifiedBy: (req as any).userId,
      rejectionReason: undefined,
    };
    await user.save();

    logger.info(`Agency approved: ${user.email} by admin ${(req as any).userId}`);
    res.json({ message: "Agency approved", verificationStatus: "verified" });
  } catch (err) {
    logger.error("Agency approve error:", err);
    res.status(500).json({ error: "Failed to approve agency" });
  }
});

// PUT /api/agency/admin/:userId/reject
router.put("/admin/:userId/reject", auth, admin, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.accountType !== "agency") {
      return res.status(400).json({ message: "User is not an agency" });
    }

    const reason = (req.body?.reason as string | undefined)?.trim() || "Did not meet verification requirements";

    user.verificationStatus = "rejected";
    user.agencyDetails = {
      ...(user.agencyDetails || {}),
      rejectionReason: reason,
    };
    await user.save();

    logger.info(`Agency rejected: ${user.email} by admin ${(req as any).userId}`);
    res.json({ message: "Agency rejected", verificationStatus: "rejected", reason });
  } catch (err) {
    logger.error("Agency reject error:", err);
    res.status(500).json({ error: "Failed to reject agency" });
  }
});

export default router;
