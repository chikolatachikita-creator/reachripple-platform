import express, { Router, Request, Response } from "express";
import SavedProfile from "../models/SavedProfile";
import authMiddleware from "../middleware/auth";

const router = Router();

// GET all saved profiles for logged-in user
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const savedProfiles = await SavedProfile.find({ userId })
      .populate("adId")
      .sort({ savedAt: -1 })
      .exec();

    res.json({ success: true, savedProfiles });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET single saved profile
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const savedProfile = await SavedProfile.findOne({
      _id: id,
      userId,
    }).populate("adId");

    if (!savedProfile) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, savedProfile });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST save a profile
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { adId } = req.body;

    if (!adId) {
      return res.status(400).json({ success: false, message: "adId required" });
    }

    // Check if already saved
    const existing = await SavedProfile.findOne({ userId, adId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Already saved" });
    }

    const savedProfile = new SavedProfile({ userId, adId });
    await savedProfile.save();

    res.status(201).json({ success: true, savedProfile });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE remove saved profile
router.delete("/:adId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { adId } = req.params;

    const result = await SavedProfile.deleteOne({ userId, adId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, message: "Removed" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
