import mongoose, { Schema, Document } from "mongoose";

export type AdStatus = "draft" | "pending" | "approved" | "rejected" | "hidden";

export type ModerationStatus =
  | "pending_review"
  | "auto_approved"
  | "approved"
  | "flagged"
  | "under_investigation"
  | "rejected"
  | "suspended";

/**
 * Placement Tiers (single source of truth for paid placement)
 * 
 * FEATURED       = Top carousel position, maximum visibility (£29.99/week)
 * PRIORITY_PLUS  = Premium placement above standard and priority (£16.99/week)
 * PRIORITY       = Higher placement above standard listings (£9.99/week)
 * STANDARD       = Basic paid listing for escorts (£4.99/week)
 * 
 * Pricing only applies to escort category. All other categories are free.
 */
export type PlacementTier = "FEATURED" | "PRIORITY_PLUS" | "PRIORITY" | "STANDARD";

export interface AdDocument extends Document {
  // ===== CORE FIELDS =====
  title: string;
  description: string;
  category: string;
  location: string;
  price: number;
  images: string[];
  status: AdStatus;
  moderationStatus: ModerationStatus;
  moderationFlags?: string[];           // Red-flag reasons detected
  moderationScore?: number;             // Computed risk score for this ad (0-100)
  moderationNote?: string;              // Admin notes on moderation decision
  moderationReviewedBy?: mongoose.Types.ObjectId;
  moderationReviewedAt?: Date;
  imageHashes?: string[];               // MD5 hashes of uploaded images for duplicate detection
  rejectionReason?: string;
  isDeleted: boolean;
  userId?: mongoose.Types.ObjectId;
  phone?: string;
  email?: string;
  services?: string[];
  age?: number;
  ethnicity?: string;
  bodyType?: string;
  
  // ===== CATEGORY-SPECIFIC FIELDS =====
  categoryFields?: Record<string, any>;  // Dynamic fields specific to each category
  
  // ===== NEW PREMIUM FEATURES =====
  // Pricing tiers (6 service durations with custom pricing)
  pricing?: {
    price_15min?: string | number;  // Quick Fix (15 min)
    price_30min?: string | number;  // Heat Check (30 min)
    price_1hour?: string | number;  // Prime Hour (1 hour)
    price_2hours?: string | number; // Two-Hour Flow (2 hours)
    price_3hours?: string | number; // Gold Session (3 hours)
    price_overnight?: string | number; // VIP Lock-In (Overnight)
  };
  
  // Selected services (from 22 AVAILABLE_SERVICES list)
  selectedServices?: string[];
  
  // Profile fields for better discovery
  profileFields?: {
    location?: string;        // Service location
    type?: string;            // "Independent" | "Agency"
    gender?: string;          // Gender identity
    age?: number;             // Age (duplicate with main age field)
    ethnicity?: string;       // Ethnicity (duplicate with main ethnicity field)
    languages?: string[];     // Languages spoken
    serviceFor?: string[];    // Target clients (Men, Women, Couples, Groups, Trans)
    incall?: boolean;         // Offers incall services
    outcall?: boolean;        // Offers outcall services
    travelRadius?: string;    // Travel radius for outcall
  };
  
  // Video gallery (up to 5 videos)
  videos?: {
    url: string;              // Video file URL (S3 or local storage)
    uploadedAt: Date;
    duration?: number;        // Video duration in seconds
  }[];
  
  // ===== ENGAGEMENT (for computed Trending badge) =====
  views: number;
  clicks: number;
  
  // ===== PLACEMENT TIER (single source of truth) =====
  tier: PlacementTier;                 // FEATURED | PRIORITY_PLUS | PRIORITY | STANDARD
  tierUntil?: Date;                    // When paid tier expires → demote to STANDARD
  
  // ===== BUMP SYSTEM =====
  // Tumble Up (manual bump) - 20min cooldown, reorders within tier
  lastPulsedAt: Date;                  // Updated on bump - used for ordering
  pulseCooldownUntil?: Date;           // 10min cooldown for manual bump
  
  // Tap Up (auto bump) - scheduled bumps 2-4x per day
  hasTapUp: boolean;
  tapUpUntil?: Date;                   // When auto-bump subscription ends
  tapUpIntervalHours: number;          // 6, 8, or 12 hours between bumps
  nextTapUpAt?: Date;                  // Next scheduled auto-bump time
  
  // ===== SCORING =====
  qualityScore: number;                // Computed from profile completeness
  visibilityScore: number;             // Composite visibility score (multiplicative)
  engagementScore: number;             // Rolling 7-day engagement sub-score
  
  // Rolling 7-day engagement event window
  metricsWindow: {
    event: string;       // view | save | wa_click | call_click | sms_click | message_started | share
    at: Date;
  }[];
  
  // ===== PAID ADD-ONS (Vivastreet-style) =====
  // Website Link (7-day default)
  websiteUrl?: string;                 // External proof link
  websiteLinkUntil?: Date;             // When website link expires
  
  // NEW Label (paid, 7-day default) - shows "NEW" badge even if older
  hasNewLabel: boolean;                // Paid NEW label active
  newLabelUntil?: Date;                // When paid NEW label expires
  
  // ===== LOCATION TRACKING =====
  locationHistory: { city: string; changedAt: Date }[];
  lastLocationChangeAt?: Date;
  
  // ===== VIVASTREET-STYLE LOCATION FIELDS =====
  categorySlug?: string;               // e.g., "escorts", "adult-entertainment"
  locationSlug?: string;               // e.g., "n1-islington", "gb"
  outcode?: string;                    // e.g., "N1", "SW1A"
  postcode?: string;                   // Full postcode (optional)
  district?: string;                   // e.g., "Islington", "Westminster"
  districtSlug?: string;               // e.g., "islington" (indexed for fast search)
  geo?: {                              // GeoJSON Point for distance queries
    type: "Point";
    coordinates: [number, number];     // [longitude, latitude]
  };
  geoUpdatedAt?: Date;                 // When geo was last updated
  geoSource?: string;                  // "postcodes.io" - source of geocoding
  
  // ===== ACTIVITY TRACKING =====
  lastActive?: Date;                   // Last user activity timestamp
  isOnline?: boolean;                  // Manual online status
  
  // ===== ROAMING LOCATIONS (cross-location visibility) =====
  roamingLocations?: {
    outcode: string;
    district?: string;
    until: Date;
  }[];
  
  // ===== TIMESTAMPS =====
  createdAt: Date;
  updatedAt: Date;
}

/**
 * COMPUTED BADGES (NOT stored, derived at query time):
 * 
 * - NEW ARRIVAL: createdAt < 48 hours ago (free, automatic)
 * - TRENDING: High engagement velocity (views+clicks in last 24h vs avg)
 * 
 * PAID BADGES (stored with expiration):
 * 
 * - NEW LABEL: hasNewLabel && newLabelUntil > now (paid, 7-day default)
 *   → Shows "NEW" even when listing is older than 48h
 * 
 * Badge display priority: Paid NEW label > Computed New Arrival
 */

const AdSchema = new Schema<AdDocument>(
  {
    // ===== CORE FIELDS =====
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "hidden"],
      default: "pending",
    },
    moderationStatus: {
      type: String,
      enum: [
        "pending_review",
        "auto_approved",
        "approved",
        "flagged",
        "under_investigation",
        "rejected",
        "suspended",
      ],
      default: "pending_review",
    },
    moderationFlags: { type: [String], default: [] },
    moderationScore: { type: Number, default: 0 },
    moderationNote: { type: String, trim: true, maxlength: 2000 },
    moderationReviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderationReviewedAt: { type: Date },
    imageHashes: { type: [String], default: [] },
    rejectionReason: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    services: {
      type: [String],
      default: [],
    },
    age: {
      type: Number,
      min: 18,
    },
    ethnicity: {
      type: String,
      trim: true,
    },
    bodyType: {
      type: String,
      trim: true,
    },
    
    // ===== CATEGORY-SPECIFIC FIELDS =====
    categoryFields: {
      type: Schema.Types.Mixed,
      default: {},
    },
    
    // ===== NEW PREMIUM FEATURES =====
    // Pricing tiers (6 service durations with custom pricing)
    pricing: {
      price_15min: { type: mongoose.Schema.Types.Mixed },  // string or number
      price_30min: { type: mongoose.Schema.Types.Mixed },
      price_1hour: { type: mongoose.Schema.Types.Mixed },
      price_2hours: { type: mongoose.Schema.Types.Mixed },
      price_3hours: { type: mongoose.Schema.Types.Mixed },
      price_overnight: { type: mongoose.Schema.Types.Mixed },
    },
    
    // Selected services (from 22 AVAILABLE_SERVICES list)
    selectedServices: {
      type: [String],
      default: [],
    },
    
    // Profile fields for better discovery
    profileFields: {
      location: { type: String, trim: true },
      type: { type: String, enum: ["Independent", "Agency"], default: "Independent" },
      gender: { type: String, trim: true },
      age: { type: Number, min: 18 },
      ethnicity: { type: String, trim: true },
      languages: { type: [String], default: [] },
      serviceFor: { type: [String], default: [] }, // ["Men", "Women", "Couples", "Groups", "Trans"]
      incall: { type: Boolean, default: true },     // Offers incall services
      outcall: { type: Boolean, default: true },    // Offers outcall services
      travelRadius: { type: String, trim: true },   // Travel radius for outcall
    },
    
    // Video gallery (up to 5 videos)
    videos: [{
      url: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      duration: { type: Number }, // Video duration in seconds
    }],
    
    // ===== ENGAGEMENT =====
    views: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    
    // ===== PLACEMENT TIER (single source of truth) =====
    tier: {
      type: String,
      enum: ["FEATURED", "PRIORITY_PLUS", "PRIORITY", "STANDARD"],
      default: "STANDARD",
    },
    tierUntil: {
      type: Date,
    },
    
    // ===== BUMP SYSTEM =====
    // Tumble Up (manual bump) - 15-30min cooldown
    lastPulsedAt: {
      type: Date,
      default: Date.now,
    },
    pulseCooldownUntil: {
      type: Date,
    },
    
    // Tap Up (auto bump)
    hasTapUp: {
      type: Boolean,
      default: false,
    },
    tapUpUntil: {
      type: Date,
    },
    tapUpIntervalHours: {
      type: Number,
      default: 12,
      enum: [6, 8, 12],
    },
    nextTapUpAt: {
      type: Date,
    },
    
    // ===== QUALITY & VISIBILITY SCORING =====
    qualityScore: {
      type: Number,
      default: 0,
    },
    visibilityScore: {
      type: Number,
      default: 0,
    },
    engagementScore: {
      type: Number,
      default: 0,
    },
    // Rolling 7-day engagement event window
    metricsWindow: [{
      event: {
        type: String,
        enum: ["view", "save", "wa_click", "call_click", "sms_click", "message_started", "share"],
        required: true,
      },
      at: { type: Date, default: Date.now },
    }],
    
    // ===== PAID ADD-ONS =====
    websiteUrl: {
      type: String,
      trim: true,
    },
    websiteLinkUntil: {
      type: Date,
    },
    
    // Paid NEW label (Vivastreet-style, 7-day default)
    hasNewLabel: {
      type: Boolean,
      default: false,
    },
    newLabelUntil: {
      type: Date,
    },
    
    // ===== LOCATION TRACKING =====
    locationHistory: [{
      city: { type: String, required: true },
      changedAt: { type: Date, default: Date.now },
    }],
    lastLocationChangeAt: {
      type: Date,
    },
    
    // ===== VIVASTREET-STYLE LOCATION FIELDS =====
    categorySlug: {
      type: String,
      trim: true,
      lowercase: true,
      default: "escorts",
    },
    locationSlug: {
      type: String,
      trim: true,
      lowercase: true,
      default: "gb",
    },
    outcode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true, // Fast outcode queries
    },
    postcode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    // Normalized district slug for fast queries (no regex needed)
    districtSlug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true, // Fast district queries
    },
    district: {
      type: String,
      trim: true,
    },
    geo: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    geoUpdatedAt: {
      type: Date,
    },
    geoSource: {
      type: String,
      default: "postcodes.io",
    },
    
    // ===== ACTIVITY TRACKING =====
    lastActive: {
      type: Date,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    
    // ===== ROAMING LOCATIONS =====
    roamingLocations: [{
      outcode: { type: String, required: true, uppercase: true, trim: true },
      district: { type: String, trim: true },
      until: { type: Date, required: true },
    }],
  },
  {
    timestamps: true,
  }
);

// ===== INDEXES FOR PERFORMANCE =====

// Basic listing queries
AdSchema.index({ status: 1, isDeleted: 1, createdAt: -1 });
AdSchema.index({ userId: 1, isDeleted: 1 });
AdSchema.index({ category: 1, status: 1 });
AdSchema.index({ location: 1, status: 1 });

// VivaStreet-style category/location queries
AdSchema.index({ categorySlug: 1, locationSlug: 1, status: 1 });
AdSchema.index({ categorySlug: 1, outcode: 1, status: 1 });
AdSchema.index({ categorySlug: 1, districtSlug: 1, status: 1 }); // Fast district search
AdSchema.index({ outcode: 1, districtSlug: 1, status: 1 }); // Location combo
AdSchema.index({ status: 1, outcode: 1, lastPulsedAt: -1 }); // Results page main query

// Geospatial index for distance queries
AdSchema.index({ geo: "2dsphere" });

// Tier-based queries (FEATURED → PRIORITY_PLUS → PRIORITY → STANDARD, then by bump time)
// This is the main query pattern for homepage
AdSchema.index({ tier: 1, lastPulsedAt: -1, qualityScore: -1, createdAt: -1 });
AdSchema.index({ tierUntil: 1 }, { sparse: true }); // For expiration cleanup

// Bump system queries
AdSchema.index({ hasTapUp: 1, nextTapUpAt: 1 }); // For scheduled auto-bumps
AdSchema.index({ lastPulsedAt: -1 }); // For ordering within tier

// Full-text search (weighted: title > location > description)
AdSchema.index(
  { title: "text", location: "text", description: "text" },
  { weights: { title: 10, location: 5, description: 1 }, name: "ad_text_search" }
);

// Website link expiration
AdSchema.index({ websiteLinkUntil: 1 }, { sparse: true });

// NEW label expiration
AdSchema.index({ newLabelUntil: 1 }, { sparse: true });

// Activity tracking
AdSchema.index({ lastActive: -1 }, { sparse: true });

// Moderation queries
AdSchema.index({ moderationStatus: 1, createdAt: -1 });
AdSchema.index({ moderationScore: -1 });

// Independent / Agency filter
AdSchema.index({ "profileFields.type": 1, status: 1, isDeleted: 1 });

// Gender filter
AdSchema.index({ "profileFields.gender": 1, status: 1 });

const Ad = mongoose.model<AdDocument>("Ad", AdSchema);

export default Ad;
