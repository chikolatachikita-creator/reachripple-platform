/**
 * TierPlan Model
 *
 * Defines all available account tier plans and their features.
 * Includes individual tiers (FREE → SPOTLIGHT) and agency tiers.
 * Seeded via scripts/seedTierPlans.ts.
 */

import mongoose, { Schema, Document } from "mongoose";

export type TierSlug =
  | "free"
  | "standard"
  | "prime"
  | "spotlight"
  | "agency_starter"
  | "agency_pro"
  | "agency_elite";

export type TierCategory = "individual" | "agency";

export interface TierPlanDocument extends Document {
  slug: TierSlug;
  name: string;
  category: TierCategory;
  priceMonthly: number;          // GBP per month (0 = free)
  priceYearly?: number;          // GBP per year (discount)
  visibilityMultiplier: number;  // Applied to visibility score
  maxAds: number;                // Max active ads allowed
  maxImages: number;             // Max images per ad
  maxVideos: number;             // Max videos per ad
  bumpCooldownHours: number;     // Hours between manual bumps
  boostDiscount: number;         // % discount on boost purchases (0–100)
  features: string[];            // Feature list for display
  isActive: boolean;
  sortOrder: number;             // Display ordering
  createdAt: Date;
  updatedAt: Date;
}

const TierPlanSchema = new Schema<TierPlanDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "free",
        "standard",
        "prime",
        "spotlight",
        "agency_starter",
        "agency_pro",
        "agency_elite",
      ],
    },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["individual", "agency"],
      required: true,
    },
    priceMonthly: { type: Number, required: true, min: 0 },
    priceYearly: { type: Number, min: 0 },
    visibilityMultiplier: { type: Number, required: true, default: 1.0 },
    maxAds: { type: Number, required: true, default: 1 },
    maxImages: { type: Number, required: true, default: 5 },
    maxVideos: { type: Number, required: true, default: 0 },
    bumpCooldownHours: { type: Number, required: true, default: 2 },
    boostDiscount: { type: Number, default: 0, min: 0, max: 100 },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TierPlanSchema.index({ category: 1, sortOrder: 1 });
TierPlanSchema.index({ isActive: 1 });

const TierPlan = mongoose.models.TierPlan ||
  mongoose.model<TierPlanDocument>("TierPlan", TierPlanSchema);

export default TierPlan;
