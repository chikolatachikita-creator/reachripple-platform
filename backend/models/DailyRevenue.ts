import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * DailyRevenueByLocation Model
 * Tracks daily revenue and inventory metrics per location
 * 
 * Used for admin revenue dashboard:
 * - Revenue by location heatmap
 * - Daily/weekly/monthly trends
 * - Inventory fill rates
 */

export interface DailyRevenueDocument extends Document {
  // Time bucket
  date: Date;                          // Date (midnight UTC)
  
  // Location
  location: string;                    // City/outcode (e.g., "london", "n1")
  locationLevel: 'city' | 'outcode';   // Granularity level
  
  // Revenue by product
  revenueTiers: {
    FEATURED: number;                  // Featured tier revenue
    PRIORITY_PLUS: number;             // Priority Plus tier revenue
    PRIORITY: number;                  // Priority tier revenue
  };
  revenueAddons: {
    TAP_UP: number;                    // Auto-bump revenue
    WEBSITE_LINK: number;              // Website link add-on
    NEW_LABEL: number;                 // NEW badge add-on
  };
  
  // Transaction counts
  purchases: {
    FEATURED: number;
    PRIORITY_PLUS: number;
    PRIORITY: number;
    TAP_UP: number;
    WEBSITE_LINK: number;
    NEW_LABEL: number;
  };
  
  // Renewals vs new purchases
  renewals: number;                    // Count of renewals
  newPurchases: number;                // Count of first-time purchases
  
  // Inventory metrics
  inventory: {
    featuredUsed: number;              // Filled FEATURED slots
    featuredCap: number;               // Max FEATURED slots
    priorityPlusUsed: number;          // Filled PRIORITY_PLUS slots
    priorityPlusCap: number;           // Max PRIORITY_PLUS slots
    totalActiveAds: number;            // Total approved ads in location
  };
  
  // Totals (computed but stored for fast queries)
  totalRevenue: number;
  totalTransactions: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyRevenueModel extends Model<DailyRevenueDocument> {
  upsertDayRevenue(
    date: Date,
    location: string,
    locationLevel: 'city' | 'outcode',
    product: string,
    amount: number,
    isRenewal: boolean
  ): Promise<DailyRevenueDocument>;
  
  getRevenueByPeriod(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<any[]>;
  
  getLocationLeaderboard(
    startDate: Date,
    endDate: Date,
    limit?: number
  ): Promise<any[]>;
}

const DailyRevenueSchema = new Schema<DailyRevenueDocument>(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    locationLevel: {
      type: String,
      enum: ['city', 'outcode'],
      default: 'city',
    },
    
    // Revenue by product
    revenueTiers: {
      FEATURED: { type: Number, default: 0 },
      PRIORITY_PLUS: { type: Number, default: 0 },
      PRIORITY: { type: Number, default: 0 },
    },
    revenueAddons: {
      TAP_UP: { type: Number, default: 0 },
      WEBSITE_LINK: { type: Number, default: 0 },
      NEW_LABEL: { type: Number, default: 0 },
    },
    
    // Transaction counts
    purchases: {
      FEATURED: { type: Number, default: 0 },
      PRIORITY_PLUS: { type: Number, default: 0 },
      PRIORITY: { type: Number, default: 0 },
      TAP_UP: { type: Number, default: 0 },
      WEBSITE_LINK: { type: Number, default: 0 },
      NEW_LABEL: { type: Number, default: 0 },
    },
    
    renewals: { type: Number, default: 0 },
    newPurchases: { type: Number, default: 0 },
    
    // Inventory metrics
    inventory: {
      featuredUsed: { type: Number, default: 0 },
      featuredCap: { type: Number, default: 10 },
      priorityPlusUsed: { type: Number, default: 0 },
      priorityPlusCap: { type: Number, default: 50 },
      totalActiveAds: { type: Number, default: 0 },
    },
    
    // Totals
    totalRevenue: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Compound index for date + location queries
DailyRevenueSchema.index({ date: 1, location: 1 }, { unique: true });

// For leaderboards by revenue
DailyRevenueSchema.index({ date: 1, totalRevenue: -1 });

// For time-series queries
DailyRevenueSchema.index({ location: 1, date: -1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Upsert revenue for a specific day/location
 */
DailyRevenueSchema.statics.upsertDayRevenue = async function(
  date: Date,
  location: string,
  locationLevel: 'city' | 'outcode',
  product: string,
  amount: number,
  isRenewal: boolean
): Promise<DailyRevenueDocument> {
  // Normalize to midnight UTC
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  
  // Determine field paths based on product type
  const isTier = ['FEATURED', 'PRIORITY_PLUS', 'PRIORITY'].includes(product);
  const revenueField = isTier 
    ? `revenueTiers.${product}` 
    : `revenueAddons.${product}`;
  const countField = `purchases.${product}`;
  const renewalField = isRenewal ? 'renewals' : 'newPurchases';
  
  return this.findOneAndUpdate(
    { date: dayStart, location: location.toLowerCase() },
    {
      $inc: {
        [revenueField]: amount,
        [countField]: 1,
        [renewalField]: 1,
        totalRevenue: amount,
        totalTransactions: 1,
      },
      $setOnInsert: {
        locationLevel,
      },
    },
    { upsert: true, new: true }
  );
};

/**
 * Get revenue aggregated by period
 */
DailyRevenueSchema.statics.getRevenueByPeriod = async function(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month'
): Promise<any[]> {
  const dateFormat = groupBy === 'day' ? '%Y-%m-%d'
    : groupBy === 'week' ? '%Y-W%V'
    : '%Y-%m';
  
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$date' } },
        totalRevenue: { $sum: '$totalRevenue' },
        totalTransactions: { $sum: '$totalTransactions' },
        featuredRevenue: { $sum: '$revenueTiers.FEATURED' },
        priorityPlusRevenue: { $sum: '$revenueTiers.PRIORITY_PLUS' },
        priorityRevenue: { $sum: '$revenueTiers.PRIORITY' },
        tapUpRevenue: { $sum: '$revenueAddons.TAP_UP' },
        renewals: { $sum: '$renewals' },
        newPurchases: { $sum: '$newPurchases' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

/**
 * Get top locations by revenue
 */
DailyRevenueSchema.statics.getLocationLeaderboard = async function(
  startDate: Date,
  endDate: Date,
  limit: number = 20
): Promise<any[]> {
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$location',
        totalRevenue: { $sum: '$totalRevenue' },
        totalTransactions: { $sum: '$totalTransactions' },
        avgDailyRevenue: { $avg: '$totalRevenue' },
        spotlightRevenue: { $sum: '$revenueTiers.SPOTLIGHT' },
        primeRevenue: { $sum: '$revenueTiers.PRIME' },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
  ]);
};

export const DailyRevenue: DailyRevenueModel = 
  (mongoose.models.DailyRevenue as DailyRevenueModel) ||
  mongoose.model<DailyRevenueDocument, DailyRevenueModel>('DailyRevenue', DailyRevenueSchema);

export default DailyRevenue;
