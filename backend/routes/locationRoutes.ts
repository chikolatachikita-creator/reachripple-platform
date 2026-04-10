/**
 * VivaStreet-mirror location services (UK-wide coverage)
 * - GET /api/location/location-suggest?q=N1
 * - GET /api/location/location-resolve?postcode=N16XW
 *
 * Uses api.postcodes.io (free).
 * 
 * Label format: "OUTCODE, Ward/District, Region"
 * e.g., "N1, Angel, North London" or "AB10, Central, Aberdeen"
 */
import { Router, Request, Response } from "express";
import GeoCache from "../models/GeoCache";
import logger from "../utils/logger";

const router = Router();

// UK region mapping for VivaStreet-style labels
const REGION_MAP: Record<string, string> = {
  // London regions
  "City of London": "Central London",
  "Westminster": "Central London",
  "Camden": "North London",
  "Islington": "North London",
  "Hackney": "East London",
  "Tower Hamlets": "East London",
  "Newham": "East London",
  "Barking and Dagenham": "East London",
  "Redbridge": "East London",
  "Havering": "East London",
  "Waltham Forest": "East London",
  "Greenwich": "South East London",
  "Lewisham": "South East London",
  "Bexley": "South East London",
  "Bromley": "South East London",
  "Southwark": "South London",
  "Lambeth": "South London",
  "Wandsworth": "South London",
  "Merton": "South London",
  "Croydon": "South London",
  "Sutton": "South London",
  "Kingston upon Thames": "South West London",
  "Richmond upon Thames": "South West London",
  "Hounslow": "West London",
  "Hillingdon": "West London",
  "Ealing": "West London",
  "Hammersmith and Fulham": "West London",
  "Kensington and Chelsea": "West London",
  "Brent": "North West London",
  "Harrow": "North West London",
  "Barnet": "North London",
  "Haringey": "North London",
  "Enfield": "North London",
  // Scotland
  "City of Edinburgh": "Edinburgh",
  "Glasgow City": "Glasgow",
  "Aberdeen City": "Aberdeen",
  "Dundee City": "Dundee",
  // Wales
  "Cardiff": "Cardiff",
  "Swansea": "Swansea",
  // Northern Ireland
  "Belfast": "Belfast",
  // Major English cities
  "Birmingham": "Birmingham",
  "Manchester": "Manchester",
  "Liverpool": "Liverpool",
  "Leeds": "Leeds",
  "Sheffield": "Sheffield",
  "Bristol, City of": "Bristol",
  "Newcastle upon Tyne": "Newcastle",
  "Nottingham": "Nottingham",
  "Leicester": "Leicester",
  "Coventry": "Coventry",
  "Bradford": "Bradford",
};

function getRegion(district: string): string {
  // Check exact match first
  if (REGION_MAP[district]) return REGION_MAP[district];
  
  // Check partial match for compound names
  for (const [key, region] of Object.entries(REGION_MAP)) {
    if (district.includes(key) || key.includes(district)) {
      return region;
    }
  }
  
  // Fallback: Use district itself or derive from it
  return district;
}

function slugify(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildLocationSlug(outcode: string, district: string): string {
  const out = outcode.toLowerCase().trim();
  const dist = slugify(district);
  if (out && dist) return `${out}-${dist}`;
  if (dist) return dist;
  if (out) return out;
  return "gb";
}

interface LocationResult {
  label: string;
  meta: string;
  outcode: string;
  district: string;
  ward: string;
  locationSlug: string;
  value: {
    locType: "outcode" | "postcode";
    outcode: string;
    district: string;
    ward: string;
    postcode: string;
    locationSlug: string;
  };
}

router.get("/location-suggest", async (req: Request, res: Response) => {
  const q = String(req.query.q || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

  if (q.length < 2) return res.json({ results: [] });

  // Pattern matching for UK postcodes
  const isOutcode = /^[A-Z]{1,2}\d[A-Z\d]?$/.test(q);
  const looksPostcodePrefix = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d/.test(q);
  const isFullPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(q.replace(/\s/g, ""));

  try {
    // =========================================
    // FULL POSTCODE => resolve to outcode+district
    // =========================================
    if (isFullPostcode) {
      const compact = q.replace(/\s/g, "");
      const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`);
      const j = await r.json();
      
      if (j?.result) {
        const outcode = String(j.result.outcode || "").toUpperCase();
        const district = String(j.result.admin_district || "");
        const ward = String(j.result.admin_ward || "");
        const region = getRegion(district);
        const locationSlug = buildLocationSlug(outcode, ward || district);
        
        // Use ward for label if available (more specific), else district
        const displayArea = ward || district;
        const label = `${outcode}, ${displayArea}, ${region}`;
        
        return res.json({
          results: [{
            label,
            meta: "Resolved from postcode",
            outcode,
            district,
            ward,
            locationSlug,
            value: {
              locType: "outcode",
              outcode,
              district,
              ward,
              postcode: j.result.postcode,
              locationSlug,
            },
          }],
        });
      }
      return res.json({ results: [] });
    }

    // =========================================
    // OUTCODE => fetch and build suggestions
    // =========================================
    if (isOutcode && q.length <= 4) {
      // First try outcode endpoint for districts
      const r = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(q)}`);
      const j = await r.json();
      
      if (j?.result) {
        const districts = ((j.result.admin_district || []) as string[]);
        const wards = ((j.result.admin_ward || []) as string[]);
        
        // Build unique combinations of outcode + ward/district
        const seen = new Set<string>();
        const results: LocationResult[] = [];
        
        // Prefer wards (more granular like "Angel", "Bethnal Green")
        // Show ALL wards, not just first 20
        for (const ward of wards) {
          // Find the district this ward belongs to
          const district = districts.find(d => 
            getRegion(d) !== d || districts.length === 1
          ) || districts[0] || "";
          
          const region = getRegion(district);
          const locationSlug = buildLocationSlug(q, ward);
          const key = `${q}-${ward}`.toLowerCase();
          
          if (!seen.has(key) && ward && ward.trim()) {
            seen.add(key);
            results.push({
              label: `${q}, ${ward}, ${region}`,
              meta: district,
              outcode: q,
              district,
              ward,
              locationSlug,
              value: {
                locType: "outcode",
                outcode: q,
                district,
                ward,
                postcode: "",
                locationSlug,
              },
            });
          }
        }
        
        // Always add districts as fallback options
        for (const district of districts) {
          const region = getRegion(district);
          const locationSlug = buildLocationSlug(q, district);
          const key = `${q}-${district}`.toLowerCase();
          
          if (!seen.has(key) && district && district.trim()) {
            seen.add(key);
            results.push({
              label: `${q}, ${district}, ${region}`,
              meta: "District",
              outcode: q,
              district,
              ward: "",
              locationSlug,
              value: {
                locType: "outcode",
                outcode: q,
                district,
                ward: "",
                postcode: "",
                locationSlug,
              },
            });
          }
        }
        
        // Cache the first result for fast lookups later
        if (results.length > 0 && j.result.latitude && j.result.longitude) {
          const first = results[0];
          GeoCache.findOneAndUpdate(
            { key: `OUTCODE:${q}` },
            {
              key: `OUTCODE:${q}`,
              type: "outcode",
              lat: j.result.latitude,
              lng: j.result.longitude,
              outcode: q,
              district: first.district,
              locationSlug: first.locationSlug,
              source: "postcodes.io",
              updatedAt: new Date(),
            },
            { upsert: true }
          ).catch(() => {});
        }
        
        // Return all results (no slice limit) so user can see everything
        return res.json({ results: results.slice(0, 30) });
      }
      
      return res.json({ results: [] });
    }

    // =========================================
    // POSTCODE PREFIX => show matching postcodes
    // =========================================
    if (looksPostcodePrefix) {
      const compact = q.replace(/\s/g, "");
      
      // Using the autocomplete endpoint for partial postcodes
      const r = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}/autocomplete`
      );
      const j = await r.json();
      const pcs = ((j?.result || []) as string[]);
      
      const results: LocationResult[] = [];
      const seenPostcodes = new Set<string>();
      
      for (const pc of pcs.slice(0, 25)) {
        if (seenPostcodes.has(pc)) continue;
        seenPostcodes.add(pc);
        
        // Extract outcode from postcode for metadata
        const match = pc.match(/^([A-Z]{1,2}\d[A-Z\d]?)\s/);
        const outcode = match ? match[1] : q.split(/\s/)[0] || compact.slice(0, -3);
        
        results.push({
          label: pc,
          meta: "Postcode",
          outcode: outcode.toUpperCase(),
          district: "",
          ward: "",
          locationSlug: outcode.toLowerCase(),
          value: {
            locType: "postcode",
            outcode: outcode.toUpperCase(),
            district: "",
            ward: "",
            postcode: pc,
            locationSlug: outcode.toLowerCase(),
          },
        });
      }

      return res.json({ results });
    }

    // =========================================
    // PLACE NAME SEARCH (Nominatim + postcodes.io fallback)
    // =========================================
    
    // 1. Try OSM Nominatim for rich place names (Stations, Areas, Landmarks)
    // We restrict to GB and limit results.
    try {
      // Small delay to be nice to public API
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=gb&limit=8&addressdetails=1`;
      const nomRes = await fetch(nomUrl, {
        headers: { "User-Agent": "ReachRipple-Platform/1.0" }
      });
      
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        
        if (Array.isArray(nomData) && nomData.length > 0) {
          const results: LocationResult[] = [];
          
          for (const item of nomData) {
            const addr = item.address || {};
            // Try to find a postcode
            const rawPc = addr.postcode || "";
            // We need at least an outcode to work with our system
            const pcMatch = rawPc.match(/^([A-Z]{1,2}\d[A-Z\d]?)\s?(\d[A-Z]{2})?$/i);
            
            // Build a friendly label from Nominatim display_name
            // default: "King's Cross Station, Euston Road, Pentonville..."
            // We want: "King's Cross Station, London"
            const parts = item.display_name.split(", ");
            const mainName = parts[0];
            const city = addr.city || addr.town || addr.village || addr.county || "";
            
            const cleanLabel = city && !mainName.includes(city) 
              ? `${mainName}, ${city}` 
              : mainName;

            let outcode = "";
            let locationSlug = "gb";
            
            if (pcMatch) {
               outcode = pcMatch[1].toUpperCase();
               const district = addr.city_district || addr.suburb || addr.city || "";
               locationSlug = buildLocationSlug(outcode, district);
               
               results.push({
                label: `${cleanLabel} (${outcode})`,
                meta: item.type || "Area", // e.g., "station", "administrative"
                outcode,
                district: district,
                ward: addr.suburb || "",
                locationSlug,
                value: {
                  locType: "postcode", // Treat as postcode-anchored result
                  outcode,
                  district,
                  ward: addr.suburb || "",
                  postcode: rawPc, // Full postcode if available
                  locationSlug
                }
               });
            } else {
              // No postcode from Nominatim? It happens. 
              // We can't easily link it to our "distance" system without a postcode center.
              // We skip it to avoid breaking the "distanced-based" search logic on frontend.
              continue;
            }
          }
          
          if (results.length > 0) {
             return res.json({ results });
          }
        }
      }
    } catch (nomErr) {
       logger.error("Nominatim search failed, falling back to postcodes.io", nomErr);
    }

    // 2. Fallback: postcodes.io query endpoint (legacy behavior)
    const r = await fetch(`https://api.postcodes.io/postcodes?q=${encodeURIComponent(q)}&limit=50`);
    const j = await r.json();
    
    if (j?.result && Array.isArray(j.result)) {
      const seen = new Set<string>();
      const results: LocationResult[] = [];
      
      for (const pc of j.result) {
        const outcode = String(pc.outcode || "").toUpperCase();
        const district = String(pc.admin_district || "");
        const ward = String(pc.admin_ward || "");
        const region = getRegion(district);
        const locationSlug = buildLocationSlug(outcode, ward || district);
        const key = `${outcode}-${ward || district}`.toLowerCase();
        
        if (!seen.has(key) && outcode) {
          seen.add(key);
          results.push({
            label: `${outcode}, ${ward || district}, ${region}`,
            meta: district,
            outcode,
            district,
            ward,
            locationSlug,
            value: {
              locType: "outcode",
              outcode,
              district,
              ward,
              postcode: "",
              locationSlug,
            },
          });
        }
      }
      
      return res.json({ results: results.slice(0, 30) });
    }

    return res.json({ results: [] });
  } catch (err) {
    logger.error("location-suggest error:", err);
    return res.json({ results: [] });
  }
});

router.get("/location-resolve", async (req: Request, res: Response) => {
  const postcode = String(req.query.postcode || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (!postcode) return res.json({ ok: false });

  try {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const j = await r.json();

    if (!j?.result) return res.json({ ok: false });

    const district = String(j.result.admin_district || "");
    const ward = String(j.result.admin_ward || "");
    const outcode = String(j.result.outcode || "").toUpperCase();
    const region = getRegion(district);
    const locationSlug = buildLocationSlug(outcode, ward || district);
    
    // Use ward for display if available
    const displayArea = ward || district;
    const label = `${outcode}, ${displayArea}, ${region}`;

    // Cache this result
    if (j.result.latitude && j.result.longitude) {
      GeoCache.findOneAndUpdate(
        { key: `POSTCODE:${postcode}` },
        {
          key: `POSTCODE:${postcode}`,
          type: "postcode",
          lat: j.result.latitude,
          lng: j.result.longitude,
          outcode,
          postcode: j.result.postcode,
          district,
          locationSlug,
          source: "postcodes.io",
          updatedAt: new Date(),
        },
        { upsert: true }
      ).catch(() => {});
    }

    return res.json({
      ok: true,
      label,
      value: {
        locType: "outcode",
        outcode,
        district,
        ward,
        postcode: j.result.postcode || postcode,
        locationSlug,
        lat: j.result.latitude,
        lng: j.result.longitude,
      },
    });
  } catch (err) {
    logger.error("location-resolve error:", err);
    return res.json({ ok: false });
  }
});

// =========================================
// LEGACY /suggest route for backward compatibility
// Redirects internally to /location-suggest
// =========================================
router.get("/suggest", async (req: Request, res: Response) => {
  const q = String(req.query.q || "").trim();
  
  if (q.length < 2) return res.json({ results: [] });
  
  // Internally call the new endpoint logic
  // Just forward the request
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes?q=${encodeURIComponent(q)}&limit=10`
    );
    const data = await response.json();
    
    if (!data.result || data.result.length === 0) {
      return res.json({ results: [] });
    }
    
    // Build results in legacy format
    const results = data.result.slice(0, 8).map((p: any) => ({
      label: `${p.outcode} — ${p.admin_ward || p.admin_district || "Unknown"}`,
      meta: p.admin_district || p.region || "",
      value: {
        type: "postcode",
        outcode: p.outcode || "",
        district: p.admin_district || "",
        postcode: p.postcode || "",
      }
    }));
    
    return res.json({ results });
  } catch (err) {
    logger.error("Legacy suggest error:", err);
    return res.json({ results: [] });
  }
});

export default router;
