import express, { Router, Request, Response } from "express";
import SearchHistory from "../models/SearchHistory";
import authMiddleware from "../middleware/auth";

const router = Router();

// GET search history for logged-in user (last 20)
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const history = await SearchHistory.find({ userId })
      .sort({ searchedAt: -1 })
      .limit(20)
      .exec();

    res.json({ success: true, history });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add to search history
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { keyword, location, category, distance, ageRange, sortBy } = req.body;

    const search = new SearchHistory({
      userId,
      keyword,
      location,
      category,
      distance,
      ageRange,
      sortBy,
    });

    await search.save();
    res.status(201).json({ success: true, search });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE all search history
router.delete("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    await SearchHistory.deleteMany({ userId });
    res.json({ success: true, message: "Cleared" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
