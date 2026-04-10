/**
 * RiskProfile Model
 *
 * Separates risk/safety data from the User model.
 * One-to-one with User — stores risk score, level, and review status.
 * Updated by riskScoringService and patternDetectionService.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  riskScore: number;
  riskLevel: RiskLevel;
  isUnderReview: boolean;
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiskProfileModel extends Model<RiskProfileDocument> {
  getOrCreate(userId: string | mongoose.Types.ObjectId): Promise<RiskProfileDocument>;
}

const RiskProfileSchema = new Schema<RiskProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    isUnderReview: {
      type: Boolean,
      default: false,
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
RiskProfileSchema.index({ riskLevel: 1, isUnderReview: 1 });
RiskProfileSchema.index({ riskScore: -1 });

/**
 * Get or create a RiskProfile for a user.
 */
RiskProfileSchema.statics.getOrCreate = async function (
  userId: string | mongoose.Types.ObjectId
): Promise<RiskProfileDocument> {
  let profile = await this.findOne({ userId });
  if (!profile) {
    profile = await this.create({ userId });
  }
  return profile;
};

export const RiskProfile = (mongoose.models.RiskProfile ||
  mongoose.model<RiskProfileDocument, RiskProfileModel>(
    "RiskProfile",
    RiskProfileSchema
  )) as RiskProfileModel;

export default RiskProfile;
