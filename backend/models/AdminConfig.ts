import mongoose, { Schema, Document, Model } from 'mongoose';
import { escapeRegex } from '../utils/sanitize';

/**
 * AdminConfig Model
 * Stores location-specific and global configuration for the boost system
 * Allows admins to control caps, pricing, and feature toggles
 */

export type ConfigScope = 'global' | 'location';

export interface AdminConfigDocument extends Document {
  // Identification
  key: string;
  scope: ConfigScope;
  location?: string; // For location-scoped configs
  
  // Inventory Caps
  vipCap?: number;
  featuredCap?: number;
  
  // Pricing Multipliers
  demandMultiplier?: number;
  
  // Duration Options (days)
  allowedDurations?: number[];
  
  // Feature Toggles
  enableTumbleUp?: boolean;
  enableTapUp?: boolean;
  enableNewLabel?: boolean;
  enableWebsiteLink?: boolean;
  
  // Tumble Up Configuration
  tumbleUpCooldownMinutes?: number;
  
  // Tap Up Configuration
  tapUpIntervals?: number[];
  
  // Display Configuration
  vipCarouselMaxItems?: number;
  featuredGridColumns?: number;
  
  // Anti-Abuse
  maxBumpsPerHour?: number;
  maxReports30d?: number;
  
  // Custom Pricing (override base prices)
  customPricing?: {
    FEATURED?: number;
    PRIORITY_PLUS?: number;
    PRIORITY?: number;
    STANDARD?: number;
    HIGHLIGHT?: number;
    EXTERNAL_LINK?: number;
  };
  
  // Metadata
  lastUpdatedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface AdminConfigModel extends Model<AdminConfigDocument> {
  getEffectiveConfig(location?: string): Promise<any>;
  checkCapacity(tier: 'FEATURED' | 'PRIORITY_PLUS', location: string, AdModel: any): Promise<{
    hasCapacity: boolean;
    currentCount: number;
    cap: number;
    remaining: number;
  }>;
  ensureGlobalConfig(): Promise<void>;
}

const AdminConfigSchema = new Schema<AdminConfigDocument>(
  {
    // Identification
    key: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ['global', 'location'],
      default: 'global',
    },
    location: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    
    // Inventory Caps
    vipCap: {
      type: Number,
      min: 0,
      max: 1000,
    },
    featuredCap: {
      type: Number,
      min: 0,
      max: 5000,
    },
    
    // Pricing Multipliers
    demandMultiplier: {
      type: Number,
      min: 0.5,
      max: 5.0,
      default: 1.0,
    },
    
    // Duration Options
    allowedDurations: {
      type: [Number],
      default: [1, 3, 7, 14, 30],
    },
    
    // Feature Toggles
    enableTumbleUp: {
      type: Boolean,
      default: true,
    },
    enableTapUp: {
      type: Boolean,
      default: true,
    },
    enableNewLabel: {
      type: Boolean,
      default: true,
    },
    enableWebsiteLink: {
      type: Boolean,
      default: true,
    },
    
    // Tumble Up Configuration
    tumbleUpCooldownMinutes: {
      type: Number,
      min: 5,
      max: 120,
      default: 20,
    },
    
    // Tap Up Configuration
    tapUpIntervals: {
      type: [Number],
      default: [6, 8, 12],
    },
    
    // Display Configuration
    vipCarouselMaxItems: {
      type: Number,
      min: 1,
      max: 50,
      default: 10,
    },
    featuredGridColumns: {
      type: Number,
      min: 2,
      max: 6,
      default: 4,
    },
    
    // Anti-Abuse
    maxBumpsPerHour: {
      type: Number,
      min: 1,
      max: 60,
      default: 6,
    },
    maxReports30d: {
      type: Number,
      min: 1,
      max: 50,
      default: 5,
    },
    
    // Custom Pricing
    customPricing: {
      FEATURED: { type: Number, min: 0 },
      PRIORITY_PLUS: { type: Number, min: 0 },
      PRIORITY: { type: Number, min: 0 },
      STANDARD: { type: Number, min: 0 },
      HIGHLIGHT: { type: Number, min: 0 },
      EXTERNAL_LINK: { type: Number, min: 0 },
    },
    
    // Metadata
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Unique config per key+scope+location
AdminConfigSchema.index({ key: 1, scope: 1, location: 1 }, { unique: true });

// Find configs by location
AdminConfigSchema.index({ scope: 1, location: 1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get effective config for a location (merges global + location-specific)
 */
AdminConfigSchema.statics.getEffectiveConfig = async function(location?: string) {
  const globalConfig = await this.findOne({ key: 'boost_settings', scope: 'global' });
  
  let locationConfig = null;
  if (location) {
    locationConfig = await this.findOne({
      key: 'boost_settings',
      scope: 'location',
      location: location.toLowerCase(),
    });
  }
  
  // Merge: location-specific overrides global
  const mergedConfig = {
    // Defaults
    vipCap: 50,
    featuredCap: 200,
    demandMultiplier: 1.0,
    allowedDurations: [1, 3, 7, 14, 30],
    enableTumbleUp: true,
    enableTapUp: true,
    enableNewLabel: true,
    enableWebsiteLink: true,
    tumbleUpCooldownMinutes: 20,
    tapUpIntervals: [6, 8, 12],
    vipCarouselMaxItems: 10,
    featuredGridColumns: 4,
    maxBumpsPerHour: 6,
    maxReports30d: 5,
    customPricing: {},
    
    // Override with global
    ...(globalConfig?.toObject() || {}),
    
    // Override with location-specific
    ...(locationConfig?.toObject() || {}),
  };
  
  return mergedConfig;
};

/**
 * Check if tier has capacity in location
 */
AdminConfigSchema.statics.checkCapacity = async function(
  tier: 'FEATURED' | 'PRIORITY_PLUS',
  location: string,
  AdModel: any
) {
  const config = await (this as any).getEffectiveConfig(location);
  const cap = tier === 'FEATURED' ? config.vipCap : config.featuredCap;
  
  const currentCount = await AdModel.countDocuments({
    tier,
    status: 'approved',
    isDeleted: { $ne: true },
    tierUntil: { $gt: new Date() },
    $or: [
      { location: new RegExp(escapeRegex(location), 'i') },
      { outcode: location.toUpperCase() },
    ],
  });
  
  return {
    hasCapacity: currentCount < cap,
    currentCount,
    cap,
    remaining: Math.max(0, cap - currentCount),
  };
};

/**
 * Ensure global config exists
 */
AdminConfigSchema.statics.ensureGlobalConfig = async function() {
  const exists = await this.findOne({ key: 'boost_settings', scope: 'global' });
  if (!exists) {
    await this.create({
      key: 'boost_settings',
      scope: 'global',
      notes: 'Default global boost configuration',
    });
  }
};

export const AdminConfig: AdminConfigModel = (mongoose.models.AdminConfig as AdminConfigModel) || 
  mongoose.model<AdminConfigDocument, AdminConfigModel>('AdminConfig', AdminConfigSchema);

export default AdminConfig;
