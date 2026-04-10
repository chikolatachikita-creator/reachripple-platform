/**
 * AdvertiserEdge Model
 *
 * Represents a detected connection between two advertiser accounts.
 * Edges are created when shared signals are found (same phone, image, device, etc.).
 *
 * The network graph is built from these edges.
 * Clusters = connected components of this graph.
 */

import mongoose, { Schema, Document } from "mongoose";

export type EdgeSignalType =
  | "phone"
  | "whatsapp"
  | "image"
  | "device"
  | "ip_subnet"
  | "payment"
  | "email";

export interface AdvertiserEdgeDocument extends Document {
  userA: mongoose.Types.ObjectId;
  userB: mongoose.Types.ObjectId;
  signalType: EdgeSignalType;
  signalValue: string;        // the shared value (hashed for PII)
  strength: number;           // 1-100: how strong this link is
  detectedAt: Date;
  lastSeenAt: Date;
  clusterId?: string;         // assigned during cluster analysis
}

const AdvertiserEdgeSchema = new Schema<AdvertiserEdgeDocument>(
  {
    userA: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userB: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    signalType: {
      type: String,
      enum: ["phone", "whatsapp", "image", "device", "ip_subnet", "payment", "email"],
      required: true,
    },
    signalValue: { type: String, required: true },
    strength: { type: Number, default: 50, min: 1, max: 100 },
    detectedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    clusterId: { type: String, default: null },
  },
  { timestamps: true }
);

// Prevent duplicate edges for same pair + signal
AdvertiserEdgeSchema.index(
  { userA: 1, userB: 1, signalType: 1, signalValue: 1 },
  { unique: true }
);
AdvertiserEdgeSchema.index({ clusterId: 1 });
AdvertiserEdgeSchema.index({ signalType: 1 });

// Strength weights per signal type
export const SIGNAL_STRENGTH: Record<EdgeSignalType, number> = {
  phone: 80,
  whatsapp: 90,
  image: 70,
  device: 75,
  ip_subnet: 40,
  payment: 85,
  email: 30,
};

export const AdvertiserEdge = mongoose.model<AdvertiserEdgeDocument>(
  "AdvertiserEdge",
  AdvertiserEdgeSchema
);

export default AdvertiserEdge;
