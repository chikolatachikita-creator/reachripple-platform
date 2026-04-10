/**
 * Subscription Model
 *
 * Tracks user account-tier subscriptions, billing cycles,
 * renewals, and expiry. One active subscription per user at a time.
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { TierSlug } from "./TierPlan";

export type SubscriptionStatus = "active" | "cancelled" | "expired" | "pending";
export type BillingCycle = "monthly" | "yearly";

export interface SubscriptionDocument extends Document {
  userId: Types.ObjectId;
  tierSlug: TierSlug;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  priceGBP: number;                 // Price locked at time of purchase
  creditsCharged?: number;          // Deprecated: kept for backward compatibility

  // Dates
  startDate: Date;
  currentPeriodEnd: Date;           // When this billing period ends
  cancelledAt?: Date;               // When user requested cancellation
  expiredAt?: Date;                 // When subscription actually expired

  // Renewal
  autoRenew: boolean;
  renewalFailedAt?: Date;           // If auto-renewal failed (insufficient credits)
  renewalAttempts: number;

  // Upgrade/downgrade tracking
  previousTierSlug?: TierSlug;      // What they upgraded/downgraded from
  upgradeCredit?: number;           // Pro-rata credit from unused previous sub

  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionModel extends Model<SubscriptionDocument> {
  getActiveSubscription(userId: string | Types.ObjectId): Promise<SubscriptionDocument | null>;
}

const SubscriptionSchema = new Schema<SubscriptionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tierSlug: {
      type: String,
      required: true,
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
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "pending"],
      default: "active",
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    priceGBP: { type: Number, required: true, min: 0 },
    creditsCharged: { type: Number, min: 0, default: 0 }, // Deprecated: kept for backward compatibility

    // Dates
    startDate: { type: Date, required: true, default: Date.now },
    currentPeriodEnd: { type: Date, required: true },
    cancelledAt: { type: Date },
    expiredAt: { type: Date },

    // Renewal
    autoRenew: { type: Boolean, default: true },
    renewalFailedAt: { type: Date },
    renewalAttempts: { type: Number, default: 0 },

    // Upgrade/downgrade
    previousTierSlug: { type: String },
    upgradeCredit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Only one active/cancelled sub per user (expired can stack for history)
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });  // For renewal cron

/**
 * Get the user's current active subscription (if any).
 */
SubscriptionSchema.statics.getActiveSubscription = async function (
  userId: string | Types.ObjectId
): Promise<SubscriptionDocument | null> {
  return this.findOne({
    userId,
    status: { $in: ["active", "cancelled"] },  // cancelled = active until period end
  }).sort({ createdAt: -1 });
};

export const Subscription: SubscriptionModel =
  (mongoose.models.Subscription as SubscriptionModel) ||
  mongoose.model<SubscriptionDocument, SubscriptionModel>(
    "Subscription",
    SubscriptionSchema
  );

export default Subscription;
