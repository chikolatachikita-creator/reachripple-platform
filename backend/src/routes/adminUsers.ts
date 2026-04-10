import express, { Request, Response } from "express";
import User from "../../models/User";
import Ad from "../../models/Ad";
import AdminLog from "../../models/AdminLog";
import mongoose from "mongoose";
import logger from "../../utils/logger";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
    const skip = (page - 1) * limit;

    const { search, role, status, isVerified } = req.query;

    const filter: any = { deleted: { $ne: true } };
    if (role) filter.role = String(role);
    if (status) filter.status = String(status);
    if (isVerified !== undefined) filter.isVerified = String(isVerified) === "true";

    if (search && typeof search === "string" && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { name: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
        { phone: { $regex: s, $options: "i" } }
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-__v").lean()
    ]);

    res.json({ total, page, limit, pages: Math.ceil(total / limit), users });
  } catch (e) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID" });
    const user = await User.findById(id).select("-__v deleted").lean() as any;
    if (!user || user.deleted) return res.status(404).json({ message: "User not found" });

    // Fetch real ads for this user
    const ads = await Ad.find({ userId: id, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("title status category createdAt tier")
      .lean();

    res.json({ user, ads });
  } catch {
    res.status(500).json({ message: "Error fetching user details" });
  }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID" });
    if (!["active", "suspended", "banned"].includes(status)) return res.status(400).json({ message: "Invalid status" });

    const previousUser = await User.findById(id).select("status email name").lean();
    if (!previousUser) return res.status(404).json({ message: "User not found" });

    const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select("-__v").lean();

    // Determine action type
    let action: "USER_SUSPEND" | "USER_BAN" | "USER_ACTIVATE" = "USER_ACTIVATE";
    if (status === "suspended") action = "USER_SUSPEND";
    if (status === "banned") action = "USER_BAN";

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action,
      targetType: "user",
      targetId: id,
      description: `Changed user "${previousUser.name}" (${previousUser.email}) status: ${previousUser.status} → ${status}`,
      previousValue: { status: previousUser.status },
      newValue: { status },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Status updated", user });
  } catch {
    res.status(500).json({ message: "Error updating status" });
  }
});

router.patch("/:id/verify", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const previousValue = user.isVerified;
    user.isVerified = req.body?.isVerified ?? !user.isVerified;
    await user.save();

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "USER_VERIFY",
      targetType: "user",
      targetId: id,
      description: `${user.isVerified ? "Verified" : "Unverified"} user "${user.name}" (${user.email})`,
      previousValue: { isVerified: previousValue },
      newValue: { isVerified: user.isVerified },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Verification updated", user });
  } catch {
    res.status(500).json({ message: "Error toggling verification" });
  }
});

// ===== ADMIN ID VERIFICATION (approve/reject advertiser verification) =====
router.patch("/:id/id-verification", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID" });
    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'verified' or 'rejected'" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const previousStatus = user.idVerificationStatus;
    user.idVerificationStatus = status;

    if (status === "verified") {
      user.idVerifiedAt = new Date();
      user.idVerifiedBy = new mongoose.Types.ObjectId((req as any).userId);
    }

    await user.save();

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "USER_VERIFY",
      targetType: "user",
      targetId: id,
      description: `ID verification ${status}: "${user.name}" (${user.email})${rejectionReason ? ` — ${rejectionReason}` : ""}`,
      previousValue: { idVerificationStatus: previousStatus },
      newValue: { idVerificationStatus: status },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      message: `ID verification ${status}`,
      user: { _id: user._id, name: user.name, email: user.email, idVerificationStatus: user.idVerificationStatus },
    });
  } catch (err) {
    logger.error("Admin ID verification error:", err);
    res.status(500).json({ message: "Error updating ID verification" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID" });

    const previousUser = await User.findById(id).select("name email status").lean();
    if (!previousUser) return res.status(404).json({ message: "User not found" });

    const user = await User.findByIdAndUpdate(id, { deleted: true, status: "banned" }, { new: true }).lean();

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "USER_DELETE",
      targetType: "user",
      targetId: id,
      description: `Soft deleted user "${previousUser.name}" (${previousUser.email})`,
      previousValue: { status: previousUser.status, deleted: false },
      newValue: { status: "banned", deleted: true },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "User soft deleted", user });
  } catch {
    res.status(500).json({ message: "Error deleting user" });
  }
});

router.post("/:id/reset-password", async (req: Request, res: Response) => {
  const crypto = require("crypto");
  const tempPassword = crypto.randomBytes(6).toString("base64url") + "A1!";

  await AdminLog.logAction({
    adminId: (req as any).userId,
    adminEmail: (req as any).userEmail || "admin",
    action: "USER_RESET_PASSWORD",
    targetType: "user",
    targetId: req.params.id,
    description: `Reset password for user ${req.params.id}`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ message: "Password reset", tempPassword });
});

// ============ BULK ACTIONS ============

// POST /api/admin/users/bulk/status
router.post("/bulk/status", async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids array is required" });
    }
    if (!["active", "suspended", "banned"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    if (ids.length > 100) {
      return res.status(400).json({ message: "Maximum 100 users per bulk action" });
    }

    const result = await User.updateMany(
      { _id: { $in: ids } },
      { $set: { status } }
    );

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "BULK_ACTION",
      targetType: "user",
      description: `Bulk status change: ${ids.length} users → ${status}`,
      newValue: { ids, status, count: result.modifiedCount },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      message: `${result.modifiedCount} users updated to "${status}"`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    logger.error("Bulk user status error:", err);
    res.status(500).json({ message: "Bulk action failed" });
  }
});

export default router;
