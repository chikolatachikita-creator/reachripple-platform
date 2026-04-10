import { Request, Response } from "express";
import mongoose from "mongoose";
import Report from "../models/Report";
import Ad from "../models/Ad";
import { AuditLog } from "../models/AuditLog";
import { addRiskPoints, RISK_POINTS } from "../services/riskScoringService";
import logger from "../utils/logger";

// GET /reports
export const getReports = async (req: Request, res: Response) => {
  try {
    const reports = await Report.find()
      .populate("adId")
      .populate("reporterId")
      .sort({ createdAt: -1 });

    return res.json({ reports });
  } catch (err: any) {
    logger.error("Failed to load reports:", err);
    return res.status(500).json({ error: "Failed to load reports" });
  }
};

// POST /reports
export const createReport = async (req: Request, res: Response) => {
  try {
    const { adId, reason, description } = req.body;
    const reporterId = (req as any).userId;

    if (!adId || !reason) {
      return res.status(400).json({ message: "adId and reason are required" });
    }

    const report = await Report.create({
      adId,
      reason,
      description: description?.slice(0, 1000) || undefined,
      reporterId,
    });

    // Update reported user's risk score (non-blocking)
    (async () => {
      try {
        const ad = await Ad.findById(adId).select("userId");
        if (ad?.userId) {
          const reportedUserId = String(ad.userId);

          // Determine risk points based on reason severity
          const severeReasons = ["underage", "trafficking", "exploitation", "coercion"];
          const isSevere = severeReasons.some(r => reason.toLowerCase().includes(r));
          const points = isSevere ? RISK_POINTS.UNDER_18_REPORT : RISK_POINTS.REPORT_RECEIVED;

          await addRiskPoints(reportedUserId, points, "REPORT_RECEIVED", `Report: ${reason}`);

          // Audit log the report
          await AuditLog.log("REPORT_SUBMITTED", {
            adId: new mongoose.Types.ObjectId(adId),
            userId: new mongoose.Types.ObjectId(reportedUserId),
            severity: isSevere ? "critical" : "warning",
            metadata: { reason, reportId: String(report._id), reporterId },
            reason: `Report submitted: ${reason}`,
          });
        }
      } catch (err: any) {
        logger.error("Failed to update risk after report:", err.message);
      }
    })();

    return res.status(201).json({ report });
  } catch (err: any) {
    logger.error("Failed to create report:", err);
    return res.status(500).json({ error: "Failed to create report" });
  }
};

// PUT /reports/:id
export const updateReport = async (req: Request, res: Response) => {
  try {
    // Only allow updating status and admin notes (prevent mass assignment)
    const { status, adminNotes } = req.body;
    const updateFields: Record<string, any> = {};
    if (status) {
      updateFields.status = status;
      if (status === "reviewed" || status === "dismissed") {
        updateFields.reviewedBy = (req as any).userId;
        updateFields.reviewedAt = new Date();
      }
    }
    if (adminNotes) updateFields.adminNotes = adminNotes;

    const report = await Report.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.json({ report });
  } catch (err: any) {
    logger.error("Failed to update report:", err);
    return res.status(500).json({ error: "Failed to update report" });
  }
};