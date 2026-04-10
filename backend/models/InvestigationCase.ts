/**
 * InvestigationCase Model
 *
 * Tracks multi-step investigations for serious issues.
 * Created when network clusters, high scam scores, or critical
 * reports require coordinated moderator attention.
 */

import mongoose, { Schema, Document } from "mongoose";

export type CaseType =
  | "network_operation"
  | "scam_ring"
  | "trafficking_concern"
  | "identity_fraud"
  | "image_abuse"
  | "repeat_offender"
  | "other";

export type CasePriority = "low" | "medium" | "high" | "critical";
export type CaseStatus = "open" | "in_progress" | "escalated" | "resolved" | "closed";

export interface CaseNoteEntry {
  author: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface InvestigationCaseDocument extends Document {
  caseNumber: string;              // auto-generated readable ID
  type: CaseType;
  priority: CasePriority;
  status: CaseStatus;

  // Related entities
  relatedUsers: mongoose.Types.ObjectId[];
  relatedAds: mongoose.Types.ObjectId[];
  relatedReports: mongoose.Types.ObjectId[];
  clusterId?: string;              // from network detection

  // Details
  title: string;
  description: string;
  notes: CaseNoteEntry[];

  // Assignment
  assignedTo?: mongoose.Types.ObjectId;

  // Outcome
  resolution?: string;
  actionsTaken: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const CaseNoteSchema = new Schema<CaseNoteEntry>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const InvestigationCaseSchema = new Schema<InvestigationCaseDocument>(
  {
    caseNumber: { type: String, unique: true, index: true },
    type: {
      type: String,
      enum: ["network_operation", "scam_ring", "trafficking_concern", "identity_fraud", "image_abuse", "repeat_offender", "other"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "escalated", "resolved", "closed"],
      default: "open",
    },

    relatedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    relatedAds: [{ type: Schema.Types.ObjectId, ref: "Ad" }],
    relatedReports: [{ type: Schema.Types.ObjectId, ref: "Report" }],
    clusterId: { type: String, default: null },

    title: { type: String, required: true },
    description: { type: String, default: "" },
    notes: { type: [CaseNoteSchema], default: [] },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },

    resolution: { type: String, default: null },
    actionsTaken: { type: [String], default: [] },

    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate case number
InvestigationCaseSchema.pre("save", async function (next) {
  if (!this.caseNumber) {
    const count = await mongoose.model("InvestigationCase").countDocuments();
    this.caseNumber = `CASE-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

InvestigationCaseSchema.index({ status: 1, priority: -1 });
InvestigationCaseSchema.index({ relatedUsers: 1 });
InvestigationCaseSchema.index({ clusterId: 1 });

export const InvestigationCase = mongoose.model<InvestigationCaseDocument>(
  "InvestigationCase",
  InvestigationCaseSchema
);

export default InvestigationCase;
