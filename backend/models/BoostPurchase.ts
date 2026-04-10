import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * BoostPurchase Model
 * Records all boost/tier purchases for billing, analytics, and expiry tracking
 */

export type BoostType = 'FEATURED' | 'PRIORITY_PLUS' | 'PRIORITY' | 'STANDARD' | 'TAP_UP' | 'HIGHLIGHT' | 'EXTERNAL_LINK';
export type BoostStatus = 'pending' | 'active' | 'expired' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface BoostPurchaseDocument extends Document {
  // Core references
  userId: Types.ObjectId;
  adId: Types.ObjectId;
  
  // Boost details
  boostType: BoostType;
  status: BoostStatus;
  
  // Timing
  purchasedAt: Date;
  activatedAt?: Date;
  expiresAt: Date;
  durationDays: number;
  
  // Configuration (for TAP_UP)
  tapUpIntervalHours?: number;
  
  // Pricing
  basePriceGBP: number;
  demandMultiplier: number;
  durationFactor: number;
  finalPriceGBP: number;
  currency: string;
  
  // Payment
  paymentStatus: PaymentStatus;
  paymentProvider?: string;
  paymentReference?: string;
  
  // Credit payment (if paid with ad credits)
  creditsPaid?: number;
  creditTransactionId?: Types.ObjectId;
  
  // Location context (for analytics)
  location?: string;
  outcode?: string;
  
  // Notifications
  expiryNotified48h: boolean;
  expiryNotified12h: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const BoostPurchaseSchema = new Schema<BoostPurchaseDocument>(
  {
    // Core references
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adId: {
      type: Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
      index: true,
    },
    
    // Boost details
    boostType: {
      type: String,
      enum: ['FEATURED', 'PRIORITY_PLUS', 'PRIORITY', 'STANDARD', 'TAP_UP', 'HIGHLIGHT', 'EXTERNAL_LINK'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'cancelled', 'refunded'],
      default: 'pending',
    },
    
    // Timing
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
    activatedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    
    // Configuration (for TAP_UP)
    tapUpIntervalHours: {
      type: Number,
      enum: [6, 8, 12],
    },
    
    // Pricing
    basePriceGBP: {
      type: Number,
      required: true,
      min: 0,
    },
    demandMultiplier: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 3.0,
    },
    durationFactor: {
      type: Number,
      default: 1.0,
      min: 0.1,
    },
    finalPriceGBP: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'GBP',
      uppercase: true,
    },
    
    // Payment
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentProvider: {
      type: String,
      trim: true,
    },
    paymentReference: {
      type: String,
      trim: true,
    },
    
    // Credit payment fields (deprecated - kept for backward compatibility with existing records)
    creditsPaid: {
      type: Number,
      min: 0,
    },
    creditTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'CreditTransaction',
    },
    
    // Location context
    location: {
      type: String,
      trim: true,
      lowercase: true,
    },
    outcode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    
    // Notifications
    expiryNotified48h: {
      type: Boolean,
      default: false,
    },
    expiryNotified12h: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Find active boosts for an ad
BoostPurchaseSchema.index({ adId: 1, status: 1, expiresAt: 1 });

// Find user's purchase history
BoostPurchaseSchema.index({ userId: 1, purchasedAt: -1 });

// Expiry notifications query
BoostPurchaseSchema.index({ status: 1, expiresAt: 1, expiryNotified48h: 1 });
BoostPurchaseSchema.index({ status: 1, expiresAt: 1, expiryNotified12h: 1 });

// Analytics: revenue by location
BoostPurchaseSchema.index({ location: 1, boostType: 1, purchasedAt: -1 });

// Find by payment reference
BoostPurchaseSchema.index({ paymentReference: 1 }, { sparse: true });

// ============================================
// STATIC METHODS
// ============================================

BoostPurchaseSchema.statics.getActiveBoostsForAd = async function(adId: Types.ObjectId) {
  return this.find({
    adId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: 1 });
};

BoostPurchaseSchema.statics.getExpiringBoosts = async function(hoursAhead: number, notifiedField: 'expiryNotified48h' | 'expiryNotified12h') {
  const now = new Date();
  const targetTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  
  return this.find({
    status: 'active',
    expiresAt: { $lte: targetTime, $gt: now },
    [notifiedField]: false,
  }).populate('userId adId');
};

BoostPurchaseSchema.statics.getRevenueStats = async function(location?: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const matchStage: any = {
    purchasedAt: { $gte: startDate },
    paymentStatus: 'completed',
  };
  
  if (location) {
    matchStage.location = location.toLowerCase();
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$boostType',
        totalRevenue: { $sum: '$finalPriceGBP' },
        count: { $sum: 1 },
        avgPrice: { $avg: '$finalPriceGBP' },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);
};

export const BoostPurchase: Model<BoostPurchaseDocument> =
  mongoose.models.BoostPurchase || mongoose.model<BoostPurchaseDocument>('BoostPurchase', BoostPurchaseSchema);

export default BoostPurchase;
