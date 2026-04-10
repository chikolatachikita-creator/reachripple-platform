import mongoose, { Schema, Document } from "mongoose";

export interface ProfileViewDocument extends Document {
  adId: mongoose.Types.ObjectId;
  advertiserId: mongoose.Types.ObjectId;
  viewerIp: string;
  referrer?: string;
  userAgent?: string;
  createdAt: Date;
}

const ProfileViewSchema = new Schema<ProfileViewDocument>(
  {
    adId: { type: Schema.Types.ObjectId, ref: "Ad", required: true, index: true },
    advertiserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    viewerIp: { type: String, required: true },
    referrer: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound indexes for efficient analytics queries
ProfileViewSchema.index({ advertiserId: 1, createdAt: -1 });
ProfileViewSchema.index({ adId: 1, createdAt: -1 });

// Prevent duplicate views from same IP within 1 hour (TTL-based dedup)
ProfileViewSchema.index(
  { adId: 1, viewerIp: 1, createdAt: 1 },
  { unique: false }
);

export default mongoose.model<ProfileViewDocument>("ProfileView", ProfileViewSchema);
