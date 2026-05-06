import { Router } from "express";
import Ad from "../../models/Ad";
import Notification from "../../models/Notification";
import AdminLog from "../../models/AdminLog";
import logger from "../../utils/logger";
const router = Router();

// Valid ad status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending"],
  pending: ["approved", "rejected"],
  approved: ["hidden", "suspended"],
  rejected: ["pending"], // Allow resubmission
  hidden: ["approved", "pending"],
  suspended: ["approved", "pending"],
};

// POST /api/admin/ads  – create one ad (admin seeding)
router.post("/", async (req, res) => {
  try {
    const ad = new Ad(req.body);
    await ad.save();

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "AD_EDIT",
      targetType: "ad",
      targetId: ad._id,
      description: `Created ad: ${ad.title}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json(ad);
  } catch (err) {
    logger.error("Error creating ad", err);
    res.status(400).json({ message: "Invalid data", error: String(err) });
  }
});

// GET LIST
router.get("/", async (req, res) => {
try {
const { page = "1", limit = "10", status, q } = req.query as any;
const pageNum = Math.max(1, parseInt(page, 10) || 1);
const limitNum = Math.max(1, parseInt(limit, 10) || 10);

const query: any = {};
if (status) query.status = status;
if (q) query.$text = { $search: q };

const ads = await Ad.find(query)
.skip((pageNum - 1) * limitNum)
.limit(+limitNum)
.sort({ createdAt: -1 });

const total = await Ad.countDocuments(query);

res.json({ ads, total });
} catch (err) {
res.status(500).json({ error: "Server error" });
}
});


// GET SINGLE
router.get("/:id", async (req, res) => {
try {
const ad = await Ad.findById(req.params.id);
if (!ad) return res.status(404).json({ error: "Not found" });
res.json(ad);
} catch {
res.status(400).json({ error: "Invalid ID" });
}
});


// UPDATE
router.put("/:id", async (req, res) => {
try {
const updated = await Ad.findByIdAndUpdate(req.params.id, req.body, {
new: true,
});
if (!updated) return res.status(404).json({ error: "Not found" });
res.json(updated);
} catch {
res.status(400).json({ error: "Invalid data" });
}
});


// SOFT DELETE
router.delete("/:id", async (req, res) => {
try {
const ad = await Ad.findById(req.params.id);
if (!ad) return res.status(404).json({ error: "Not found" });

const previousStatus = ad.status;
ad.isDeleted = true;
ad.status = "hidden";
await ad.save();

await AdminLog.logAction({
  adminId: (req as any).userId,
  adminEmail: (req as any).userEmail || "admin",
  action: "AD_DELETE",
  targetType: "ad",
  targetId: ad._id,
  description: `Soft deleted ad: ${ad.title}`,
  previousValue: { status: previousStatus, isDeleted: false },
  newValue: { status: "hidden", isDeleted: true },
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

res.json({ message: "Deleted", deleted: ad });
} catch {
res.status(400).json({ error: "Invalid ID" });
}
});


// CHANGE STATUS (with workflow validation and notifications)
router.patch("/:id/status", async (req, res) => {
try {
const { status, rejectionReason } = req.body;
if (!status) return res.status(400).json({ error: "Missing status" });

const ad = await Ad.findById(req.params.id);
if (!ad) return res.status(404).json({ error: "Not found" });

// Validate status transition
const currentStatus = ad.status || "pending";
const allowedTransitions = VALID_TRANSITIONS[currentStatus];
if (allowedTransitions && !allowedTransitions.includes(status)) {
  return res.status(400).json({
    error: `Cannot transition from "${currentStatus}" to "${status}". Allowed: ${allowedTransitions.join(", ")}`,
  });
}

const previousStatus = ad.status;
ad.status = status;
if (status === "rejected" && rejectionReason) {
  ad.rejectionReason = rejectionReason;
} else if (status === "approved") {
  ad.rejectionReason = undefined;
}
await ad.save();

// Determine log action
let logAction: "AD_APPROVE" | "AD_REJECT" | "AD_STATUS_CHANGE" = "AD_STATUS_CHANGE";
if (status === "approved") logAction = "AD_APPROVE";
if (status === "rejected") logAction = "AD_REJECT";

await AdminLog.logAction({
  adminId: (req as any).userId,
  adminEmail: (req as any).userEmail || "admin",
  action: logAction,
  targetType: "ad",
  targetId: ad._id,
  description: `Changed ad "${ad.title}" status: ${previousStatus} → ${status}${rejectionReason ? ` (reason: ${rejectionReason})` : ""}`,
  previousValue: { status: previousStatus },
  newValue: { status, rejectionReason: rejectionReason || undefined },
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// Create notification for user
if (ad.userId) {
  if (status === "approved") {
    await Notification.create({
      user: ad.userId,
      type: "ad-approved",
      message: `Your ad "${ad.title}" has been approved and is now live! 🎉`,
      meta: { adId: ad._id },
    });
  } else if (status === "rejected") {
    await Notification.create({
      user: ad.userId,
      type: "ad-rejected",
      message: `Your ad "${ad.title}" was rejected${rejectionReason ? `: ${rejectionReason}` : ". Please review and resubmit."}`,
      meta: { adId: ad._id, reason: rejectionReason },
    });
  }
}

res.json(ad);
} catch {
res.status(400).json({ error: "Invalid ID" });
}
});


// BOOST AD - POST /api/admin/ads/:id/boost
// body: { days: number } - how many days to boost (default: 1)
router.post("/:id/boost", async (req, res) => {
  try {
    const days = Number(req.body.days || 1);
    const boostedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const previous = await Ad.findById(req.params.id).select("isBoosted boostedUntil title");
    if (!previous) return res.status(404).json({ error: "Ad not found" });
    const prev = previous as any;

    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
      { isBoosted: true, boostedUntil },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Ad not found" });

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "AD_BOOST",
      targetType: "ad",
      targetId: updated._id,
      description: `Boosted ad "${updated.title}" for ${days} day(s)`,
      previousValue: { isBoosted: prev.isBoosted, boostedUntil: prev.boostedUntil },
      newValue: { isBoosted: true, boostedUntil },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: `Ad boosted for ${days} day(s)`, ad: updated });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID or request" });
  }
});


// REMOVE BOOST - DELETE /api/admin/ads/:id/boost
router.delete("/:id/boost", async (req, res) => {
  try {
    const previous = await Ad.findById(req.params.id).select("isBoosted boostedUntil tier tierUntil title");
    if (!previous) return res.status(404).json({ error: "Ad not found" });
    const prev = previous as any;

    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
      { isBoosted: false, boostedUntil: null, tier: "STANDARD", tierUntil: null },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Ad not found" });

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "AD_BOOST",
      targetType: "ad",
      targetId: updated._id,
      description: `Removed boost from ad "${updated.title}"`,
      previousValue: { isBoosted: prev.isBoosted, boostedUntil: prev.boostedUntil, tier: previous.tier, tierUntil: previous.tierUntil },
      newValue: { isBoosted: false, boostedUntil: null, tier: "STANDARD", tierUntil: null },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Boost removed", ad: updated });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});


// SET TIER - POST /api/admin/ads/:id/tier
// body: { tier: "FEATURED" | "PRIORITY_PLUS" | "PRIORITY" | "STANDARD", days?: number }
// Default: 7 days (Vivastreet-style)
router.post("/:id/tier", async (req, res) => {
  try {
    const { tier = "FEATURED", days = 7 } = req.body;
    const validTiers = ["FEATURED", "PRIORITY_PLUS", "PRIORITY", "STANDARD"];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: `Invalid tier. Must be one of: ${validTiers.join(", ")}` });
    }

    const previous = await Ad.findById(req.params.id).select("tier tierUntil title");
    if (!previous) return res.status(404).json({ error: "Ad not found" });

    const tierUntil = tier === "STANDARD" ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
      { tier, tierUntil },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Ad not found" });

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "AD_TIER_CHANGE",
      targetType: "ad",
      targetId: updated._id,
      description: `Set ad "${updated.title}" tier to ${tier}${tier === "STANDARD" ? "" : ` for ${days} day(s)`}`,
      previousValue: { tier: previous.tier, tierUntil: previous.tierUntil },
      newValue: { tier, tierUntil },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: `Ad set to ${tier} for ${days} day(s)`, ad: updated });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID or request" });
  }
});


// SET NEW LABEL (paid) - POST /api/admin/ads/:id/new-label
// body: { days?: number } - Default: 7 days (Vivastreet-style)
router.post("/:id/new-label", async (req, res) => {
  try {
    const days = Number(req.body.days || 7);
    const newLabelUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
      { hasNewLabel: true, newLabelUntil },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Ad not found" });

    res.json({ message: `NEW label added for ${days} day(s)`, ad: updated });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID or request" });
  }
});


// REMOVE NEW LABEL - DELETE /api/admin/ads/:id/new-label
router.delete("/:id/new-label", async (req, res) => {
  try {
    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
      { hasNewLabel: false, newLabelUntil: null },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Ad not found" });

    res.json({ message: "NEW label removed", ad: updated });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});


// SET WEBSITE LINK (paid) - POST /api/admin/ads/:id/website-link
// body: { url: string, days?: number } - Default: 7 days
router.post("/:id/website-link", async (req, res) => {
  try {
    const { url, days = 7 } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    const websiteLinkUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
      { websiteUrl: url, websiteLinkUntil },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Ad not found" });

    res.json({ message: `Website link added for ${days} day(s)`, ad: updated });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID or request" });
  }
});


// REMOVE WEBSITE LINK - DELETE /api/admin/ads/:id/website-link
router.delete("/:id/website-link", async (req, res) => {
  try {
    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
      { websiteUrl: null, websiteLinkUntil: null },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Ad not found" });

    res.json({ message: "Website link removed", ad: updated });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});


// LEGACY: SET VIP (maps to SPOTLIGHT) - POST /api/admin/ads/:id/vip
// body: { days: number } - Default: 7 days (Vivastreet-style)
router.post("/:id/vip", async (req, res) => {
  try {
    const days = Number(req.body.days || 7);
    const tierUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
      { tier: "FEATURED", tierUntil },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Ad not found" });

    res.json({ message: `Ad set to FEATURED (VIP) for ${days} day(s)`, ad: updated });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID or request" });
  }
});


// LEGACY: REMOVE VIP (demotes to STANDARD) - DELETE /api/admin/ads/:id/vip
router.delete("/:id/vip", async (req, res) => {
  try {
    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
      { tier: "STANDARD", tierUntil: null },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Ad not found" });

    res.json({ message: "Demoted to STANDARD tier", ad: updated });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});


// ============ BULK ACTIONS ============

// POST /api/admin/ads/bulk/status  – change status for multiple ads at once
// body: { ids: string[], status: string, rejectionReason?: string }
router.post("/bulk/status", async (req, res) => {
  try {
    const { ids, status, rejectionReason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }
    if (ids.length > 100) {
      return res.status(400).json({ error: "Maximum 100 ads per bulk action" });
    }

    const updateData: any = { status };
    if (status === "rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const result = await Ad.updateMany(
      { _id: { $in: ids } },
      { $set: updateData }
    );

    // Log bulk action
    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "BULK_ACTION",
      targetType: "ad",
      description: `Bulk status change: ${ids.length} ads → ${status}`,
      newValue: { ids, status, count: result.modifiedCount },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      message: `${result.modifiedCount} ads updated to "${status}"`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    logger.error("Bulk status error:", err);
    res.status(500).json({ error: "Bulk action failed" });
  }
});

// POST /api/admin/ads/bulk/delete  – soft delete multiple ads
// body: { ids: string[] }
router.post("/bulk/delete", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    if (ids.length > 100) {
      return res.status(400).json({ error: "Maximum 100 ads per bulk action" });
    }

    const result = await Ad.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true, status: "hidden" } }
    );

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "BULK_ACTION",
      targetType: "ad",
      description: `Bulk delete: ${ids.length} ads soft-deleted`,
      newValue: { ids, count: result.modifiedCount },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      message: `${result.modifiedCount} ads deleted`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    logger.error("Bulk delete error:", err);
    res.status(500).json({ error: "Bulk delete failed" });
  }
});


export default router;