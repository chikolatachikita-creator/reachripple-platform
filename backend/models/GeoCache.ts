/**
 * GeoCache - Caches postcodes.io geocoding results
 * 
 * Prevents repeated API calls for the same postcode/outcode.
 * TTL: 60 days (configurable via index expireAfterSeconds)
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface GeoCacheDocument extends Document {
  // Key - e.g. "OUTCODE:N1" or "POSTCODE:N16XW"
  key: string;
  type: "outcode" | "postcode";
  
  // Geocoded coordinates
  lat: number;
  lng: number;
  
  // Additional data from postcodes.io
  outcode?: string;        // e.g., "N1"
  postcode?: string;       // e.g., "N1 6XW" (for postcode type)
  district?: string;       // e.g., "Islington" (admin_district)
  locationSlug?: string;   // e.g., "n1-islington" (for URL building)
  
  // Cache metadata
  source: string;          // "postcodes.io"
  createdAt: Date;
  updatedAt: Date;
}

const GeoCacheSchema = new Schema<GeoCacheDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["outcode", "postcode"],
      required: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    outcode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    postcode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    locationSlug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    source: {
      type: String,
      default: "postcodes.io",
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index: Auto-delete documents after 60 days (5184000 seconds)
// This ensures cache stays fresh without manual cleanup
GeoCacheSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

// Compound index for fast lookups
GeoCacheSchema.index({ key: 1, type: 1 });

export const GeoCache: Model<GeoCacheDocument> =
  mongoose.models.GeoCache || mongoose.model<GeoCacheDocument>("GeoCache", GeoCacheSchema);

export default GeoCache;
