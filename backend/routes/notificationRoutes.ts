import { Router, Request, Response } from "express";
import Notification from "../models/Notification";
import auth from "../middleware/auth";
import logger from "../utils/logger";

const router = Router();

// GET /api/notifications/my - Get user's notifications
router.get("/my", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const notifs = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ notifications: notifs });
  } catch (err) {
    logger.error("Get notifications error:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

// GET /api/notifications/unread-count - Get count of unread notifications
router.get("/unread-count", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const count = await Notification.countDocuments({ user: userId, read: false });
    res.json({ count });
  } catch (err) {
    logger.error("Get unread count error:", err);
    res.status(500).json({ message: "Failed to get count" });
  }
});

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
// NOTE: Must be defined BEFORE /:id/read to avoid Express matching "mark-all-read" as an :id
router.patch("/mark-all-read", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    await Notification.updateMany({ user: userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    logger.error("Mark all read error:", err);
    res.status(500).json({ message: "Failed to mark all read" });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch("/:id/read", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Not found" });
    res.json({ notification: notif });
  } catch (err) {
    logger.error("Mark notification read error:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

export default router;
