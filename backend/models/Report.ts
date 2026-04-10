import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ReportStatus = "pending" | "reviewing" | "reviewed" | "dismissed";

export interface ReportDocument extends Document {
  adId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reason: string;
  description?: string;
  status: ReportStatus;
  adminNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
}

const ReportSchema = new Schema<ReportDocument>(
  {
    adId: { type: Schema.Types.ObjectId, ref: "Ad", required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    description: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "reviewing", "reviewed", "dismissed"],
      default: "pending",
    },
    adminNotes: { type: String, maxlength: 2000 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ adId: 1 });

export const Report: Model<ReportDocument> =
  mongoose.models.Report ||
  mongoose.model<ReportDocument>("Report", ReportSchema);

export default Report;
