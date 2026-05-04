import { Request, Response } from "express";
import mongoose from "mongoose";
import Ad from "../models/Ad";
import GeoCache from "../models/GeoCache";
import User from "../models/User";
import { getLocationCoords, calculateDistance, normalizeLocationFields, slugify } from "../utils/locationUtils";
import { updateAdQualityScore } from "../services/trustSafetyService";
import { checkAdCreationAllowed } from "../services/abusePreventionService";
import { moderateNewAd, rescanAd } from "../services/moderationService";
import { processUploadedFiles, fileUrl } from "../services/uploadService";
import { notifyAdApproved, notifyAdRejected } from "../services/notificationService";
import logger from "../utils/logger";

// =====================================================
// GEOCODE HELPERS (postcodes.io integration + caching)
// =====================================================

const CACHE_MAX_AGE_DAYS = 60;

type GeoResult = {
  lat: number;
  lng: number;
  outcode: string;
  district: string;
  locationSlug: string;
};

function isFresh(d?: Date): boolean {
  if (!d) return false;
  const ageMs = Date.now() - new Date(d).getTime();
  return ageMs < CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function normalizePostcode(raw: string): string {
  return String(raw || "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

function compactPostcode(raw: string): string {
  return normalizePostcode(raw).replace(" ", "");
}

// Same slug rule as frontend (keep it identical)
export function slugifyLocation(v: { outcode?: string; district?: string }): string {
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

/**
 * Geocode a full postcode with caching
 * Checks GeoCache first â†’ else fetches from postcodes.io â†’ upserts cache
 */
async function geocodePostcode(postcodeRaw: string): Promise<GeoResult | null> {
  const pc = compactPostcode(postcodeRaw);
  if (!pc) return null;

  const cacheKey = `POSTCODE:${pc}`;

  try {
    // Check cache first (with freshness check)
    const cached = await GeoCache.findOne({ key: cacheKey, type: "postcode" }).lean();
    if (cached && isFresh(cached.updatedAt)) {
      return {
        lat: cached.lat,
        lng: cached.lng,
        outcode: cached.outcode || "",
        district: cached.district || "",
        locationSlug: cached.locationSlug || "",
      };
    }

    // Cache miss or stale - fetch from postcodes.io
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
    const j = await r.json();

    if (!j?.result) return null;

    const latitude = j.result.latitude;
    const longitude = j.result.longitude;
    const outcode = String(j.result.outcode || "").toUpperCase();
    const district = String(j.result.admin_district || "").trim();
    const locationSlug = slugifyLocation({ outcode, district });

    if (typeof latitude !== "number" || typeof longitude !== "number") return null;

    // Upsert cache (fire-and-forget, don't block response)
    GeoCache.findOneAndUpdate(
      { key: cacheKey },
      {
        key: cacheKey,
        type: "postcode",
        lat: latitude,
        lng: longitude,
        outcode,
        postcode: normalizePostcode(postcodeRaw),
        district,
        locationSlug,
        source: "postcodes.io",
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    ).catch((err) => logger.error("GeoCache upsert error:", err));

    return { lat: latitude, lng: longitude, outcode, district, locationSlug };
  } catch (err) {
    logger.error("geocodePostcode error:", err);
    return null;
  }
}

/**
 * Geocode an outcode (area code) with caching
 * Returns center point and metadata for radius queries
 */
async function geocodeOutcode(outcodeRaw: string): Promise<GeoResult | null> {
  const out = String(outcodeRaw || "").toUpperCase().trim();
  if (!out) return null;

  const cacheKey = `OUTCODE:${out}`;

  try {
    // Check cache first (with freshness check)
    const cached = await GeoCache.findOne({ key: cacheKey, type: "outcode" }).lean();
    if (cached && isFresh(cached.updatedAt)) {
      return {
        lat: cached.lat,
        lng: cached.lng,
        outcode: cached.outcode || out,
        district: cached.district || "",
        locationSlug: cached.locationSlug || out.toLowerCase(),
      };
    }

    // Cache miss or stale - fetch from postcodes.io
    const r = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(out)}`);
    const j = await r.json();
    if (!j?.result) return null;

    const latitude = j.result.latitude;
    const longitude = j.result.longitude;
    // For outcodes, admin_district is an array
    const district = Array.isArray(j.result.admin_district) 
      ? (j.result.admin_district[0] || "") 
      : String(j.result.admin_district || "");
    const locationSlug = district ? slugifyLocation({ outcode: out, district }) : out.toLowerCase();

    if (typeof latitude !== "number" || typeof longitude !== "number") return null;

    // Upsert cache (fire-and-forget)
    GeoCache.findOneAndUpdate(
      { key: cacheKey },
      {
        key: cacheKey,
        type: "outcode",
        lat: latitude,
        lng: longitude,
        outcode: out,
        district,
        locationSlug,
        source: "postcodes.io",
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    ).catch((err) => logger.error("GeoCache upsert error:", err));

    return { lat: latitude, lng: longitude, outcode: out, district, locationSlug };
  } catch (err) {
    logger.error("geocodeOutcode error:", err);
    return null;
  }
}

function milesToMeters(miles: number): number {
  return Math.round(miles * 1609.34);
}

function escapeRegexPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCategoryFilter(categoryValue?: string) {
  const normalized = String(categoryValue || "").trim().toLowerCase();
  if (!normalized) return undefined;

  const aliases = new Set<string>([normalized]);

  if (normalized === "escort" || normalized === "escorts") {
    aliases.add("escort");
    aliases.add("escorts");
  }

  const patterns = Array.from(aliases).map(
    (alias) => new RegExp(`^${escapeRegexPattern(alias)}$`, "i")
  );

  return patterns.length === 1 ? patterns[0] : { $in: patterns };
}

// =====================================================
// END GEOCODE HELPERS
// =====================================================

// GET /ads (pagination + filters + search)
export const getAds = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      search = "",
      category,
      location,
      status,
      minPrice,
      maxPrice,
      minAge,
      maxAge,
      maxDistance,
      d,           // VivaStreet-style distance param (miles) - preferred over maxDistance
      ethnicity,
      bodyType,
      services,
      sortBy,
      // VivaStreet-style location params
      outcode,     // e.g., "N1", "SW1A"
      district,    // e.g., "Islington" - DISPLAY ONLY, not used for filtering
      postcode,    // e.g., "N1 6XW" (exact match)
      locType,     // "outcode" | "postcode" | "district"
      // Geo coordinates for distance radius (VivaStreet-style)
      lat,         // Latitude from location-resolve
      lng,         // Longitude from location-resolve
      // Profile-level filters
      independent, // "1" â†’ only profileFields.type === "Independent"
      gender,      // e.g., "Female" â†’ profileFields.gender
      verified,    // "1" â†’ only verified profiles
      available,   // "1" â†’ only online / available today
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, Math.min(parseInt(page, 10) || 1, 10000));
    const limitNum = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
    
    // Use 'd' (VivaStreet-style) or fall back to maxDistance for backwards compatibility
    const distanceMiles = Number(d ?? maxDistance ?? 0);

    // Validate price range (0 to 100,000)
    const minPriceNum = Math.max(0, parseInt(minPrice || "0", 10) || 0);
    const maxPriceNum = Math.min(100000, parseInt(maxPrice || "100000", 10) || 100000);
    
    if (minPriceNum > maxPriceNum) {
      return res.status(400).json({ error: "Invalid price range: minPrice must be <= maxPrice" });
    }

    // Validate age range (18 to 100)
    const minAgeNum = Math.max(18, parseInt(minAge || "18", 10) || 18);
    const maxAgeNum = Math.min(100, parseInt(maxAge || "100", 10) || 100);
    
    if (minAgeNum > maxAgeNum) {
      return res.status(400).json({ error: "Invalid age range: minAge must be <= maxAge" });
    }

    let ads: any[] = [];
    
    // NOTE: Tier/label/boost cleanup is handled by the scheduled bumpService cron job.
    // Removed per-request updateMany operations that were causing performance issues.

    const query: any = {
      isDeleted: false,
    };

    if (search) {
      // Use MongoDB $text index for fast full-text search (index on title + description)
      // Falls back to regex for short queries or location search
      if (search.length >= 3) {
        query.$text = { $search: search };
      } else {
        // Short queries: regex fallback
        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const safeSearch = escapeRegex(search);
        query.$or = [
          { title: new RegExp(safeSearch, "i") },
          { description: new RegExp(safeSearch, "i") },
          { location: new RegExp(safeSearch, "i") },
        ];
      }
    }
    const categoryFilter = buildCategoryFilter(category);
    if (categoryFilter) query.category = categoryFilter;
    if (location) {
      const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.location = new RegExp(escapeRegex(location), "i");
    }
    if (status) query.status = status;
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {
        const price = parseInt(minPrice, 10);
        if (!isNaN(price) && price > 0) {
          query.price.$gte = price;
        }
      }
      if (maxPrice) {
        const price = parseInt(maxPrice, 10);
        if (!isNaN(price) && price > 0) {
          query.price.$lte = price;
        }
      }
    }
    
    // Age range filter
    if (minAge || maxAge) {
      query.age = {};
      if (minAge) {
        const age = parseInt(minAge, 10);
        if (!isNaN(age) && age >= 18 && age <= 90) {
          query.age.$gte = age;
        }
      }
      if (maxAge) {
        const age = parseInt(maxAge, 10);
        if (!isNaN(age) && age >= 18 && age <= 90) {
          query.age.$lte = age;
        }
      }
    }
    
    // Ethnicity filter
    if (ethnicity && ethnicity !== "Any") {
      query.ethnicity = ethnicity;
    }

    // Body Type filter
    if (bodyType && bodyType !== "Any") {
      query.bodyType = bodyType;
    }
    
    // Services filter (matches any of the selected services)
    if (services) {
      const serviceList = services.split(",").filter(s => s.trim());
      if (serviceList.length > 0) {
        query.services = { $in: serviceList };
      }
    }

    // Independent / Agency filter
    if (independent === "1") {
      query["profileFields.type"] = "Independent";
    }

    // Gender filter
    if (gender && gender !== "Any") {
      query["profileFields.gender"] = gender;
    }

    // Verified-only filter (only show ads from verified users)
    if (verified === "1") {
      query.isVerified = true;
    }

    // Available today / online filter
    if (available === "1") {
      query.isOnline = true;
    }

    // =====================================================
    // VIVASTREET-STYLE LOCATION FILTERING
    // =====================================================
    // VivaStreet pattern:
    // - If d > 0 and center exists â†’ $geoNear is PRIMARY filter
    // - outcode/district become secondary constraints (or skipped)
    // - Geo filter determines the area; no need for regex overlap
    //
    // This is "broad + radius-based" NOT "strict + district AND outcode"
    // =====================================================
    
    const normalizedOutcode = outcode ? outcode.trim().toUpperCase() : "";
    const parsedLat = parseFloat(lat || "");
    const parsedLng = parseFloat(lng || "");
    let hasGeoCoords = !Number.isNaN(parsedLat) && !Number.isNaN(parsedLng);
    let centerLat = parsedLat;
    let centerLng = parsedLng;
    
    // AUTO-GEOCODE: Get center point for radius queries
    if (distanceMiles > 0 && !hasGeoCoords) {
      if (locType === "postcode" && postcode) {
        const normalizedPostcode = postcode.trim().toUpperCase().replace(/\s+/g, " ");
        const g = await geocodePostcode(normalizedPostcode);
        if (g) {
          centerLat = g.lat;
          centerLng = g.lng;
          hasGeoCoords = true;
        }
      } else if (normalizedOutcode) {
        const center = await geocodeOutcode(normalizedOutcode);
        if (center) {
          centerLat = center.lat;
          centerLng = center.lng;
          hasGeoCoords = true;
        }
      }
    }
    
    // Determine if we should use $geoNear aggregation
    let useGeoNear = distanceMiles > 0 && hasGeoCoords;
    
    if (useGeoNear) {
      // =====================================================
      // USE $geoNear AGGREGATION (primary filter, returns distance)
      // =====================================================
      const meters = milesToMeters(distanceMiles);
      
      // Build match stage for non-geo filters
      const matchStage: any = { ...query };
      
      // NOTE: When using $geoNear, we skip outcode regex
      // because geo already limits the area (no over-restriction)
      
      const pipeline: any[] = [
        // $geoNear MUST be first stage
        {
          $geoNear: {
            near: { type: "Point" as const, coordinates: [centerLng, centerLat] as [number, number] },
            distanceField: "distanceMeters",
            maxDistance: meters,
            spherical: true,
            query: matchStage,
          },
        },
        // Add computed fields: distanceMiles + tierPriority for correct sort order
        {
          $addFields: {
            distanceMiles: { $divide: ["$distanceMeters", 1609.34] },
            tierPriority: {
              $switch: {
                branches: [
                  { case: { $eq: ["$tier", "FEATURED"] }, then: 4 },
                  { case: { $eq: ["$tier", "PRIORITY_PLUS"] }, then: 3 },
                  { case: { $eq: ["$tier", "PRIORITY"] }, then: 2 },
                ],
                default: 1,
              },
            },
          },
        },
        // Sort by tier priority first, then distance (closest first), then by bump time
        {
          $sort: sortBy === "price-low" ? { price: 1 } :
                 sortBy === "price-high" ? { price: -1 } :
                 sortBy === "newest" ? { createdAt: -1 } :
                 { tierPriority: -1, distanceMeters: 1, lastPulsedAt: -1 } as any,
        },
        // Pagination
        { $skip: (pageNum - 1) * limitNum },
        { $limit: limitNum },
      ];
      
      try {
        ads = await Ad.aggregate(pipeline);
        
        // Get total count using same geo query
        const countPipeline: any[] = [
          {
            $geoNear: {
              near: { type: "Point" as const, coordinates: [centerLng, centerLat] as [number, number] },
              distanceField: "distanceMeters",
              maxDistance: meters,
              spherical: true,
              query: matchStage,
            },
          },
          { $count: "total" },
        ];
        const countResult = await Ad.aggregate(countPipeline);
        const dbTotal = countResult[0]?.total || 0;
        
        // Check if there are ads without geo that might be missing
        const adsWithoutGeo = await Ad.countDocuments({
          ...query,
          $or: [
            { geo: { $exists: false } },
            { "geo.coordinates": { $exists: false } },
          ],
        });
        
        let geoWarning: string | undefined;
        if (adsWithoutGeo > 0) {
          geoWarning = `${adsWithoutGeo} ad(s) may not appear in distance search (missing postcode/location data)`;
        }
        
        return res.json({ 
          ads, 
          total: dbTotal, 
          dbTotal,
          distanceEnabled: true,
          centerPoint: { lat: centerLat, lng: centerLng },
          radiusMiles: distanceMiles,
          geoWarning,
        });
      } catch (geoErr: any) {
        // Geospatial query failed - fall back to regular search without distance
        logger.warn("Geospatial query failed, falling back to regular search", { 
          error: geoErr.message,
          distanceMiles,
          centerLat,
          centerLng
        });
        
        // Fall through to standard query below
        useGeoNear = false;
      }
    }
    
    if (!useGeoNear) {
      // =====================================================
      // STANDARD QUERY (no geo, use find())
      // =====================================================
      
      // Build location filter conditions
      const locationConditions: any[] = [];
      
      if (locType === "postcode" && postcode) {
        // Exact postcode match (flexible spacing)
        const normalizedPostcode = postcode.trim().toUpperCase().replace(/\s+/g, " ");
        query.postcode = normalizedPostcode;
      } else if (normalizedOutcode) {
        // VivaStreet-style: outcode filter ONLY (district is display-only)
        locationConditions.push({
          $or: [
            { outcode: normalizedOutcode },
            { postcode: new RegExp(`^${normalizedOutcode}\\s?`, "i") },
          ],
        });
      }
      
      // Combine location conditions with AND
      if (locationConditions.length > 0) {
        if (!query.$and) query.$and = [];
        query.$and.push(...locationConditions);
      }

      // DO NOT sort by tier here - frontend buildHomeLists() handles bucket separation
      // But DO rank by: tier priority â†’ lastPulsedAt â†’ qualityScore â†’ createdAt
      // Use aggregation with $switch to map tier strings to numeric priority
      if (sortBy === "price-low" || sortBy === "price-high" || sortBy === "newest") {
        const simpleSort: any = sortBy === "price-low" ? { price: 1 } :
                                sortBy === "price-high" ? { price: -1 } :
                                { createdAt: -1 };
        ads = await Ad.find(query)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .sort(simpleSort);
      } else {
        // Default sort: tier priority (numeric) â†’ lastPulsedAt â†’ qualityScore â†’ createdAt
        ads = await Ad.aggregate([
          { $match: query },
          {
            $addFields: {
              tierPriority: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$tier", "FEATURED"] }, then: 4 },
                    { case: { $eq: ["$tier", "PRIORITY_PLUS"] }, then: 3 },
                    { case: { $eq: ["$tier", "PRIORITY"] }, then: 2 },
                  ],
                  default: 1,
                },
              },
            },
          },
          { $sort: { tierPriority: -1, lastPulsedAt: -1, qualityScore: -1, createdAt: -1 } },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
        ]);
      }

      // Get total count from DB for pagination info
      const dbTotal = await Ad.countDocuments(query);

      return res.json({ 
        ads, 
        total: dbTotal, 
        dbTotal,
        distanceEnabled: false,
      });
    }
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET /ads/:id
export const getAdById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format before querying (prevents CastError spam)
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ad ID format" });
    }

    // Increment views and get the ad
    const ad = await Ad.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!ad || ad.isDeleted) {
      return res.status(404).json({ message: "Ad not found" });
    }
    return res.json(ad);
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET /ads/my - Get current user's ads
export const getMyAds = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const ads = await Ad.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
    return res.json({ ads });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /ads
export const createAd = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // ===== EARLY VALIDATION (required fields) =====
    const missingFields: string[] = [];
    if (!req.body.title || !String(req.body.title).trim()) missingFields.push("title");
    if (!req.body.description || !String(req.body.description).trim()) missingFields.push("description");
    if (!req.body.category || !String(req.body.category).trim()) missingFields.push("category");
    if (!req.body.location || !String(req.body.location).trim()) missingFields.push("location");
    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
    }

    // ===== POSTING LIMIT CHECK (only enforced for adult/escort categories) =====
    const limitCheck = await checkAdCreationAllowed(
      new mongoose.Types.ObjectId(userId),
      req.body.category,
      req.body.categorySlug,
    );
    if (!limitCheck.allowed) {
      return res.status(403).json({ 
        error: limitCheck.reason,
        currentCount: limitCheck.currentCount,
        maxAllowed: limitCheck.maxAllowed,
      });
    }

    // Parse services if it's a JSON string (from FormData)
    let services = req.body.services;
    if (typeof services === "string") {
      try {
        services = JSON.parse(services);
      } catch {
        services = services.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    
    // NEW: Parse selectedServices if it's a JSON string (from FormData)
    let selectedServices = req.body.selectedServices;
    if (typeof selectedServices === "string") {
      try {
        selectedServices = JSON.parse(selectedServices);
      } catch {
        selectedServices = selectedServices.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    
    // NEW: Parse pricing if it's a JSON string (from FormData)
    let pricing = req.body.pricing;
    if (typeof pricing === "string") {
      try {
        pricing = JSON.parse(pricing);
      } catch {
        pricing = undefined;
      }
    }
    
    // NEW: Parse profileFields if it's a JSON string (from FormData)
    let profileFields = req.body.profileFields;
    if (typeof profileFields === "string") {
      try {
        profileFields = JSON.parse(profileFields);
      } catch {
        profileFields = undefined;
      }
    }
    
    // NEW: Parse categoryFields if it's a JSON string (from FormData)
    let categoryFields = req.body.categoryFields;
    if (typeof categoryFields === "string") {
      try {
        categoryFields = JSON.parse(categoryFields);
      } catch {
        categoryFields = undefined;
      }
    }
    
    // Get uploaded file paths (upload.fields returns an object, not array)
    const uploadedFiles = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const imageFiles = uploadedFiles?.images || [];
    const videoFiles = uploadedFiles?.videos || [];
    
    let images: string[] = [];
    let videoPaths: string[] = [];
    try {
      images = await processUploadedFiles(imageFiles, "uploads/images");
      videoPaths = await processUploadedFiles(videoFiles, "uploads/videos");
    } catch (uploadErr: any) {
      logger.error("Media upload failed during ad creation:", {
        message: uploadErr?.message,
        stack: uploadErr?.stack,
      });
      return res.status(500).json({
        error: `Image upload failed: ${uploadErr?.message || "unknown error"}. Please try again with smaller files or different images.`,
      });
    }
    const videos = videoPaths.map((url) => ({
      url,
      uploadedAt: new Date(),
    }));
    
    // NORMALIZE LOCATION FIELDS for fast indexed search
    // Derives outcode, district, districtSlug from location/postcode
    const locationData = normalizeLocationFields(
      req.body.location,
      req.body.postcode
    );
    
    // Derive price from pricing object if not provided
    let price = parseFloat(req.body.price);
    if (isNaN(price) || price <= 0) {
      // Try to get price from pricing tiers
      if (pricing) {
        price = parseFloat(pricing.price_1hour) ||
                parseFloat(pricing.price_30min) ||
                parseFloat(pricing.price_15min) ||
                parseFloat(pricing.price_2hours) ||
                100; // Default fallback
      } else {
        price = 100; // Default price
      }
    }
    
    // Build the ad data object
    const adData: any = {
      ...req.body,
      services,
      selectedServices,
      pricing,
      profileFields,
      categoryFields,
      images,
      videos,
      userId,
      price, // Ensure price is set
      status: "pending", // New ads are always pending
    };

    // Sanitize numeric fields — empty strings cause Mongoose CastErrors
    if (adData.age !== undefined) {
      const parsedAge = parseInt(adData.age, 10);
      if (isNaN(parsedAge) || parsedAge < 18) {
        delete adData.age;
      } else {
        adData.age = parsedAge;
      }
    }

    // Remove non-schema fields
    delete adData.agreeToTerms;

    // Inject normalized location fields
    adData.outcode = locationData.outcode;
    adData.district = locationData.district;
    adData.districtSlug = locationData.districtSlug;
    adData.locationSlug = locationData.locationSlug || slugify(req.body.location || "gb");
    adData.categorySlug = slugify(req.body.category || "escorts");

    // AUTO-GEOCODE: If postcode provided, fetch lat/lng from postcodes.io
    if (req.body?.postcode) {
      try {
        const g = await geocodePostcode(req.body.postcode);

        if (g) {
          adData.postcode = normalizePostcode(req.body.postcode);
          adData.outcode = g.outcode;
          adData.district = g.district;
          adData.locationSlug = slugifyLocation({ outcode: g.outcode, district: g.district });

          // GeoJSON uses [lng, lat]
          adData.geo = { type: "Point", coordinates: [g.lng, g.lat] };
          adData.geoUpdatedAt = new Date();
          adData.geoSource = "postcodes.io";
        } else {
          // Still store normalized postcode even if geocode failed
          adData.postcode = normalizePostcode(req.body.postcode);
        }
      } catch (geoErr: any) {
        // Geocoding is non-essential — log and continue without coordinates
        logger.error("Geocoding failed (non-fatal):", geoErr?.message);
        try { adData.postcode = normalizePostcode(req.body.postcode); } catch {}
      }
    }
    
    const ad = await Ad.create(adData);
    
    // Calculate initial quality score asynchronously (non-blocking)
    updateAdQualityScore(ad._id.toString()).catch((err: any) => 
      logger.error("Quality score calculation failed:", err.message)
    );

    // Run moderation pipeline asynchronously (non-blocking)
    // Sets moderationStatus, moderationFlags, moderationScore, imageHashes
    moderateNewAd(ad._id).catch((err: any) =>
      logger.error("Ad moderation pipeline failed:", err.message)
    );
    
    // ── Anti-fraud: signal extraction + scam analysis (non-blocking) ──
    (async () => {
      try {
        const { ingestSignals, generateDeviceFingerprint } = await import("../services/signalService");
        const { hashImagePaths, hashImageBuffers } = await import("../services/imageHashService");
        const { analyseAdvertiserScam } = await import("../services/scamDetectionService");

        // Generate perceptual image hashes
        let pHashes: string[] = [];
        if (imageFiles.length > 0) {
          pHashes = imageFiles[0]?.buffer
            ? await hashImageBuffers(imageFiles)
            : await hashImagePaths(images);
        }

        // Extract and ingest signals
        await ingestSignals(String(userId), {
          phone: req.body.phone || req.body.whatsapp,
          whatsapp: req.body.whatsapp,
          ip: req.ip,
          deviceFingerprint: generateDeviceFingerprint(req),
          imageHashes: pHashes,
          city: req.body.location,
        });

        // Run scam analysis
        const adText = `${req.body.title || ""} ${req.body.description || ""}`;
        await analyseAdvertiserScam(String(userId), adText);
      } catch (err: any) {
        logger.error("Anti-fraud pipeline failed:", err.message);
      }
    })();
    
    return res.status(201).json(ad);
  } catch (err: any) {
    // Verbose logging — the previous generic "Server error" hid the real cause.
    logger.error("createAd failed:", {
      message: err?.message,
      name: err?.name,
      code: err?.code,
      stack: err?.stack,
    });
    // Return 400 for validation/cast errors so the client sees a meaningful response
    if (err.name === "ValidationError" || err.name === "CastError") {
      const message = err.name === "ValidationError"
        ? Object.values(err.errors).map((e: any) => e.message).join(", ")
        : `Invalid value for field: ${err.path}`;
      return res.status(400).json({ error: message });
    }
    // Duplicate key
    if (err.code === 11000) {
      return res.status(409).json({ error: "Duplicate value for unique field" });
    }
    // Surface the underlying message so users / support can act on it instead
    // of a useless generic "Server error".
    const safeMessage = typeof err?.message === "string" && err.message.length < 300
      ? err.message
      : "Server error";
    return res.status(500).json({ error: safeMessage });
  }
};

// PUT /ads/:id
export const updateAd = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Parse JSON fields if they're strings (from FormData)
    let pricing = req.body.pricing;
    if (typeof pricing === "string") {
      try {
        pricing = JSON.parse(pricing);
      } catch {
        pricing = undefined;
      }
    }
    
    let profileFields = req.body.profileFields;
    if (typeof profileFields === "string") {
      try {
        profileFields = JSON.parse(profileFields);
      } catch {
        profileFields = undefined;
      }
    }
    
    let selectedServices = req.body.selectedServices;
    if (typeof selectedServices === "string") {
      try {
        selectedServices = JSON.parse(selectedServices);
      } catch {
        selectedServices = selectedServices.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    
    // Handle new video uploads if any
    const files = (req.files as Express.Multer.File[]) || [];
    const videoFiles = files.filter((f) => f.fieldname === "videos");
    const videoPaths = await processUploadedFiles(videoFiles, "uploads/videos");
    const newVideos = videoPaths.map((url) => ({
      url,
      uploadedAt: new Date(),
    }));
    
    const updateData: any = {
      ...req.body,
      pricing,
      profileFields,
      selectedServices,
    };
    
    // Append new videos to existing videos
    if (newVideos.length > 0) {
      updateData.videos = newVideos;
    }
    
    // NORMALIZE LOCATION FIELDS if location/postcode changed
    if (req.body.location || req.body.postcode) {
      const locationData = normalizeLocationFields(
        req.body.location,
        req.body.postcode
      );
      if (locationData.outcode) updateData.outcode = locationData.outcode;
      if (locationData.district) updateData.district = locationData.district;
      if (locationData.districtSlug) updateData.districtSlug = locationData.districtSlug;
      if (locationData.locationSlug) updateData.locationSlug = locationData.locationSlug;
    }
    
    // RE-GEOCODE: If postcode changed, fetch new lat/lng from postcodes.io
    if (req.body?.postcode) {
      const incomingPostcode = normalizePostcode(req.body.postcode);
      
      // Check if postcode actually changed by fetching current ad
      const existingAd = await Ad.findOne({ _id: req.params.id, userId });
      const postcodeChanged = incomingPostcode && incomingPostcode !== (existingAd?.postcode || "");
      
      if (postcodeChanged) {
        const g = await geocodePostcode(incomingPostcode);
        updateData.postcode = incomingPostcode;

        if (g) {
          updateData.outcode = g.outcode;
          updateData.district = g.district;
          updateData.locationSlug = slugifyLocation({ outcode: g.outcode, district: g.district });
          updateData.geo = { type: "Point", coordinates: [g.lng, g.lat] };
          updateData.geoUpdatedAt = new Date();
          updateData.geoSource = "postcodes.io";
        } else {
          // If invalid postcode, clear geo so it won't be used for radius
          updateData.geo = undefined;
          updateData.geoUpdatedAt = new Date();
        }
      }
    }
    
    // Normalize category slug if category changed
    if (req.body.category) {
      updateData.categorySlug = slugify(req.body.category);
    }
    
    // Verify user owns this ad before updating
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, userId }, // Only update if user owns the ad
      updateData,
      { new: true }
    );
    if (!ad) {
      return res.status(403).json({ message: "Not authorized to update this ad" });
    }

    // Re-scan for moderation flags after content changes (non-blocking)
    rescanAd(ad._id).catch((err: any) =>
      logger.error("Ad rescan after update failed:", err.message)
    );

    return res.json(ad);
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// PUT /ads/:id/approve
export const approveAd = async (req: Request, res: Response) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }
    // Notify the ad owner
    notifyAdApproved(ad.userId?.toString() ?? '', ad.title, ad._id.toString()).catch(() => {});
    return res.json(ad);
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// PUT /ads/:id/reject
export const rejectAd = async (req: Request, res: Response) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }
    // Notify the ad owner
    notifyAdRejected(ad.userId?.toString() ?? '', ad.title, ad._id.toString(), req.body.reason).catch(() => {});
    return res.json(ad);
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// DELETE /ads/:id (soft delete)
export const deleteAd = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Verify user owns this ad before deleting
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, userId }, // Only delete if user owns the ad
      { isDeleted: true },
      { new: true }
    );
    if (!ad) {
      return res.status(403).json({ message: "Not authorized to delete this ad" });
    }
    return res.json({ message: "Ad deleted" });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// PUT /ads/:id/user - User can update their own ad
export const updateMyAd = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const ad = await Ad.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }
    
    // Check if user owns this ad
    if (ad.userId?.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to edit this ad" });
    }
    
    // Parse JSON fields from FormData
    let services = req.body.services;
    if (typeof services === "string") {
      try { services = JSON.parse(services); } catch { services = services.split(",").map((s: string) => s.trim()).filter(Boolean); }
    }

    let selectedServices = req.body.selectedServices;
    if (typeof selectedServices === "string") {
      try { selectedServices = JSON.parse(selectedServices); } catch { selectedServices = selectedServices.split(",").map((s: string) => s.trim()).filter(Boolean); }
    }

    let pricing = req.body.pricing;
    if (typeof pricing === "string") {
      try { pricing = JSON.parse(pricing); } catch { pricing = undefined; }
    }

    let profileFields = req.body.profileFields;
    if (typeof profileFields === "string") {
      try { profileFields = JSON.parse(profileFields); } catch { profileFields = undefined; }
    }

    let categoryFields = req.body.categoryFields;
    if (typeof categoryFields === "string") {
      try { categoryFields = JSON.parse(categoryFields); } catch { categoryFields = undefined; }
    }

    let languages = req.body.languages;
    if (typeof languages === "string") {
      try { languages = JSON.parse(languages); } catch { languages = undefined; }
    }

    let serviceFor = req.body.serviceFor;
    if (typeof serviceFor === "string") {
      try { serviceFor = JSON.parse(serviceFor); } catch { serviceFor = undefined; }
    }

    // Handle existing images/videos (kept by user)
    let existingImages: string[] = ad.images || [];
    if (req.body.existingImages) {
      try {
        existingImages = typeof req.body.existingImages === "string"
          ? JSON.parse(req.body.existingImages) : req.body.existingImages;
      } catch { /* keep current */ }
    }

    let existingVideos: any[] = ad.videos || [];
    if (req.body.existingVideos) {
      try {
        existingVideos = typeof req.body.existingVideos === "string"
          ? JSON.parse(req.body.existingVideos) : req.body.existingVideos;
      } catch { /* keep current */ }
    }

    // Handle new file uploads
    const uploadedFiles = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const imageFiles = uploadedFiles?.images || [];
    const videoFiles = uploadedFiles?.videos || [];

    const newImagePaths = await processUploadedFiles(imageFiles, "uploads/images");
    const newVideoPaths = await processUploadedFiles(videoFiles, "uploads/videos");

    // Merge existing + new
    const finalImages = [...existingImages, ...newImagePaths];
    const finalVideos = [
      ...existingVideos,
      ...newVideoPaths.map((url) => ({ url, uploadedAt: new Date() })),
    ];

    // Build update data with all supported fields
    const updateData: any = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      location: req.body.location,
      phone: req.body.phone,
      email: req.body.email,
      whatsapp: req.body.whatsapp,
      age: req.body.age,
      gender: req.body.gender,
      ethnicity: req.body.ethnicity,
      bodyType: req.body.bodyType,
      services,
      selectedServices,
      pricing,
      profileFields,
      categoryFields,
      images: finalImages,
      videos: finalVideos,
      status: "pending", // Reset to pending for re-review
    };

    // Remove undefined keys so we don't overwrite with undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    // Derive price from pricing if not directly provided
    let price = parseFloat(req.body.price);
    if (!isNaN(price) && price > 0) {
      updateData.price = price;
    } else if (pricing) {
      price = parseFloat(pricing.price_1hour) ||
              parseFloat(pricing.price_30min) ||
              parseFloat(pricing.price_15min) ||
              parseFloat(pricing.price_2hours) || 0;
      if (price > 0) updateData.price = price;
    }

    // NORMALIZE LOCATION FIELDS if location/postcode changed
    if (req.body.location || req.body.postcode) {
      const locationData = normalizeLocationFields(req.body.location, req.body.postcode);
      if (locationData.outcode) updateData.outcode = locationData.outcode;
      if (locationData.district) updateData.district = locationData.district;
      if (locationData.districtSlug) updateData.districtSlug = locationData.districtSlug;
      if (locationData.locationSlug) updateData.locationSlug = locationData.locationSlug;
    }

    // Normalize category slug if category changed
    if (req.body.category) {
      updateData.categorySlug = slugify(req.body.category);
    }

    // RE-GEOCODE: If postcode changed, fetch new lat/lng
    if (req.body.postcode) {
      const incomingPostcode = normalizePostcode(req.body.postcode);
      const postcodeChanged = incomingPostcode && incomingPostcode !== (ad.postcode || "");

      if (postcodeChanged) {
        const g = await geocodePostcode(incomingPostcode);
        updateData.postcode = incomingPostcode;

        if (g) {
          updateData.outcode = g.outcode;
          updateData.district = g.district;
          updateData.locationSlug = slugifyLocation({ outcode: g.outcode, district: g.district });
          updateData.geo = { type: "Point", coordinates: [g.lng, g.lat] };
          updateData.geoUpdatedAt = new Date();
          updateData.geoSource = "postcodes.io";
        } else {
          updateData.geo = undefined;
          updateData.geoUpdatedAt = new Date();
        }
      }
    }
    
    const updatedAd = await Ad.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // Re-calculate quality score after update (non-blocking)
    updateAdQualityScore(req.params.id).catch((err: any) =>
      logger.error("Quality score update failed:", err.message)
    );

    // Re-scan for moderation flags after content changes (non-blocking)
    rescanAd(updatedAd!._id).catch((err: any) =>
      logger.error("Ad rescan after update failed:", err.message)
    );
    
    return res.json(updatedAd);
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// DELETE /ads/:id/user - User can delete their own ad
export const deleteMyAd = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const ad = await Ad.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }
    
    // Check if user owns this ad
    if (ad.userId?.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this ad" });
    }
    
    await Ad.findByIdAndUpdate(req.params.id, { isDeleted: true });
    
    return res.json({ message: "Ad deleted successfully" });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
