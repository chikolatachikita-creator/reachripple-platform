import { Request, Response } from "express";
import mongoose from "mongoose";
import Report from "../../models/Report";
import AdminLog from "../../models/AdminLog";
import logger from "../../utils/logger";

export const getReports = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
    const skip = (page - 1) * limit;
    const { search = "", status = "all" } = req.query;

    const query: any = {};
    if (search && typeof search === "string" && search.trim()) {
      query.reason = { $regex: search.trim(), $options: "i" };
    }
    if (status !== "all") query.status = String(status);

    const [total, reports] = await Promise.all([
      Report.countDocuments(query),
      Report.find(query)
        .populate("adId", "title status")
        .populate("reporterId", "name email")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      reports,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error("Admin getReports error:", err);
    res.status(500).json({ message: "Failed to load reports" });
  }
};

export const resolveReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const validStatuses = ["reviewing", "reviewed", "dismissed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const previousStatus = report.status;
    report.status = status;

    if (adminNotes !== undefined) {
      report.adminNotes = adminNotes.slice(0, 2000);
    }

    // Set reviewer info when moving beyond "pending"
    if (status === "reviewed" || status === "dismissed") {
      report.reviewedBy = new mongoose.Types.ObjectId((req as any).userId);
      report.reviewedAt = new Date();
    }

    await report.save();

    await AdminLog.logAction({
      adminId: (req as any).userId,
      adminEmail: (req as any).userEmail || "admin",
      action: "REPORT_RESOLVE",
      targetType: "report",
      targetId: id,
      description: `Report ${status}: reason "${report.reason}"${adminNotes ? ` — notes: ${adminNotes.slice(0, 100)}` : ""}`,
      previousValue: { status: previousStatus },
      newValue: { status, adminNotes: adminNotes?.slice(0, 100) },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: `Report ${status}`, report });
  } catch (err) {
    logger.error("Admin resolveReport error:", err);
    res.status(500).json({ message: "Failed to resolve report" });
  }
};
