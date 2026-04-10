/**
 * Backfill script to add geo coordinates to existing ads
 * 
 * Run with: npx ts-node scripts/backfillGeo.ts
 * 
 * This script:
 * 1. Finds all ads that have a postcode but no geo coordinates
 * 2. Geocodes each postcode using postcodes.io
 * 3. Updates the ad with lat/lng, outcode, district, locationSlug
 * 4. Rate-limits requests to be polite to the API (120ms between requests)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import Ad model
import Ad from "../models/Ad";

// =====================================================
// GEOCODE HELPERS (same as in adController.ts)
// =====================================================

function normalizePostcode(raw: string): string {
  return String(raw || "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

function compactPostcode(raw: string): string {
  return normalizePostcode(raw).replace(" ", "");
}

function slugifyLocation(v: { outcode?: string; district?: string }): string {
  const out = (v.outcode || "").toLowerCase().trim();
  const dist = (v.district || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (out && dist) return `${out}-${dist}`;
  if (dist) return dist;
  if (out) return out;
  return "gb";
}

type GeoResult = {
  lat: number;
  lng: number;
  outcode: string;
  district: string;
};

async function geocodePostcode(postcodeRaw: string): Promise<GeoResult | null> {
  const pc = compactPostcode(postcodeRaw);
  if (!pc) return null;

  try {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
    const j = await r.json();

    if (!j?.result) return null;

    const lat = j.result.latitude;
    const lng = j.result.longitude;
    const outcode = String(j.result.outcode || "").toUpperCase();
    const district = String(j.result.admin_district || "").trim();

    if (typeof lat !== "number" || typeof lng !== "number") return null;

    return { lat, lng, outcode, district };
  } catch (err) {
    console.error(`geocodePostcode error for ${pc}:`, err);
    return null;
  }
}

// =====================================================
// MAIN BACKFILL FUNCTION
// =====================================================

async function main() {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";
  
  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const BATCH_SIZE = 100;
  let totalProcessed = 0;
  let totalGeocoded = 0;
  let totalFailed = 0;

  console.log("\n🔍 Finding ads with postcode but no geo coordinates...\n");

  while (true) {
    // Find ads that:
    // 1. Have a postcode (exists and not empty)
    // 2. Don't have geo coordinates yet
    const ads = await Ad.find({
      $and: [
        { postcode: { $exists: true, $ne: "" } },
        { 
          $or: [
            { geo: { $exists: false } }, 
            { "geo.coordinates": { $exists: false } },
            { "geo.coordinates": { $size: 0 } }
          ] 
        },
      ],
    }).limit(BATCH_SIZE);

    if (!ads.length) {
      console.log("\n✅ No more ads to process!");
      break;
    }

    console.log(`📦 Processing batch of ${ads.length} ads...`);

    for (const ad of ads) {
      totalProcessed++;
      const postcode = ad.postcode!;
      
      console.log(`  [${totalProcessed}] Geocoding: ${postcode} (Ad: ${ad._id})`);
      
      const g = await geocodePostcode(postcode);
      
      if (!g) {
        console.log(`    ❌ Failed to geocode`);
        totalFailed++;
        continue;
      }

      // Update the ad with geocoded data
      ad.postcode = normalizePostcode(postcode);
      ad.outcode = g.outcode;
      ad.district = g.district;
      ad.locationSlug = slugifyLocation({ outcode: g.outcode, district: g.district });
      ad.geo = { type: "Point", coordinates: [g.lng, g.lat] };
      (ad as any).geoUpdatedAt = new Date();
      (ad as any).geoSource = "postcodes.io";
      
      await ad.save();
      totalGeocoded++;
      
      console.log(`    ✅ Geocoded: ${g.outcode} ${g.district} (${g.lat}, ${g.lng})`);

      // Rate limit: 120ms between requests (polite to postcodes.io)
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 BACKFILL COMPLETE");
  console.log("=".repeat(50));
  console.log(`Total ads processed: ${totalProcessed}`);
  console.log(`Successfully geocoded: ${totalGeocoded}`);
  console.log(`Failed to geocode: ${totalFailed}`);
  console.log("=".repeat(50) + "\n");

  await mongoose.disconnect();
  console.log("👋 Disconnected from MongoDB");
}

// Run the script
main().catch((e) => {
  console.error("❌ Backfill script error:", e);
  process.exit(1);
});
