import React, { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { useSearchParams, useParams, useLocation, useNavigate } from "react-router-dom";
import { getAds, getAd } from "../api/ads";
import { saveSearch } from "../api/searchHistory";
import api from "../api/client";
import { buildHomeLists, isNewArrivalAd, isTrendingAd } from "../utils/homeRanking";
import { useToastContext } from "../context/ToastContextGlobal";
import Navbar from "../components/Navbar";
import SearchCardVivaStreet, { slugifyLocation } from "../components/search/SearchCardVivaStreet";
import FilterBottomSheet from "../components/FilterBottomSheet";
import ActiveFilterChips from "../components/search/ActiveFilterChips";
import ProfileQuickViewModal from "../components/ProfileQuickViewModal";
import AgeGateModal from "../components/trust/AgeGateModal";

// New search components
import {
  SearchResultCard,
  SkeletonCard,
  FilterBar,
  FilterSidebar,
  SortDropdown,
  EmptyState,
  LoadMoreButton,
} from "../components/search";
import { GallerySkeletons } from "../components/ui/SkeletonLoader";

const CATEGORY_LABELS = {
  escorts: "Escorts",
  "adult-entertainment": "Adult Entertainment",
  personals: "Personals",
};

/**
 * SearchResultsPage - VivaStreet Mirror Implementation
 * 
 * URL Contract (Option A - Unified Scalable Route):
 * - Path: /:categorySlug/:locationSlug (e.g., /escorts/n1-islington)
 * - Query: ?d=10&locType=outcode&outcode=N1&district=Islington
 * - Uses 'd' (not 'distance') everywhere for consistency
 * 
 * Key Features:
 * 1. Location is encoded in PATH (VivaStreet style)
 * 2. Postcode searches → resolve → canonical outcode URL redirect
 * 3. Supports both new unified route and legacy /escorts/:location routes
 * 4. Filters sync with URL (path + query) for shareable links
 * 
 * Desktop Layout:
 * [ FILTER SIDEBAR ]  [ RESULTS GRID (3 columns) ]
 * 
 * Mobile Layout:
 * [ Sticky Filter Bar ]
 * [ Results – 1 column, big cards ]
 * [ Sticky Bottom Nav ]
 */
export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams();
  useLocation(); // Track location changes for re-renders
  const navigate = useNavigate();
  const { showError: showToastError } = useToastContext();

  // ===== ROUTE PARAMETERS =====
  // Extract categorySlug and locationSlug from route
  // Supports both /escort/:location and /:categorySlug/:locationSlug patterns
  const categorySlug = useMemo(() => {
    return "escort"; // Matches /escort/:location route
  }, []);

  const locationSlug = useMemo(() => {
    const slug = params.location || "gb";
    return slug || "gb";
  }, [params.location]);

  // ===== STATE =====
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const retryCountRef = useRef(0);

  // Track if we've hydrated from URL to avoid double fetches
  const didHydrateRef = useRef(false);
  
  // Track pending redirects to prevent render during redirect
  const [pendingRedirect, setPendingRedirect] = useState(null);

  // Sorting state
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "recommended");

  // Quick View State (Deep Linking)
  const [quickViewProfile, setQuickViewProfile] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  // Handle Quick View Logic
  const quickViewId = searchParams.get("quickview");
  useEffect(() => {
    if (quickViewId) {
        // 1. Check if profile is already in loaded results
        const existing = profiles.find(p => p._id === quickViewId);
        
        if (existing) {
            setQuickViewProfile(existing);
            setIsQuickViewOpen(true);
        } else {
            // 2. If not, fetch it independently
            getAd(quickViewId)
                .then(ad => {
                    setQuickViewProfile(ad);
                    setIsQuickViewOpen(true);
                })
                .catch(err => {
                    console.error("Failed to load quick view profile", err);
                    // Remove invalid param
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete("quickview");
                    setSearchParams(newParams, { replace: true });
                });
        }
    } else {
        setIsQuickViewOpen(false);
        setQuickViewProfile(null);
    }
  }, [quickViewId, profiles, searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickView = useCallback((id) => {
      // Update URL to trigger the useEffect above
      setSearchParams((prev) => {
          const p = new URLSearchParams(prev);
          p.set("quickview", id);
          return p;
      });
  }, [setSearchParams]);

  const handleCloseQuickView = useCallback(() => {
    setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.delete("quickview");
        return p;
    });
  }, [setSearchParams]);

  // Single source of truth: parse from URL (path + query)
  const [filters, setFilters] = useState(() => ({
    keyword: searchParams.get("q") || "",

    // VivaStreet: location is encoded in PATH
    location: locationSlug && locationSlug !== "gb" ? locationSlug : "gb",

    // VivaStreet location payload (query params)
    locationType: searchParams.get("locType") || "",
    outcode: searchParams.get("outcode") || "",
    district: searchParams.get("district") || "",
    postcode: searchParams.get("postcode") || "",
    lat: searchParams.get("lat") || "",
    lng: searchParams.get("lng") || "",

    // VivaStreet distance param key: 'd' only
    d: Number(searchParams.get("d") ?? 0),

    ageRange: [parseInt(searchParams.get("minAge")) || 18, parseInt(searchParams.get("maxAge")) || 60],
    priceRange: [parseInt(searchParams.get("minPrice")) || 0, parseInt(searchParams.get("maxPrice")) || 500],
    ethnicity: searchParams.get("eth") || "",
    bodyType: searchParams.get("body") || "",
    gender: searchParams.get("gender") || "",
    verifiedOnly: searchParams.get("verified") === "1",
    availableToday: searchParams.get("available") === "1",
    independentOnly: searchParams.get("independent") === "1",
    services: searchParams.get("services")?.split(",").filter(Boolean) || [],
  }));

  // Keep filters synced when URL changes (back/forward, direct links)
  // Uses shallow compare to avoid redundant state updates
  useEffect(() => {
    const nextFilters = {
      keyword: searchParams.get("q") || "",
      location: locationSlug && locationSlug !== "gb" ? locationSlug : "gb",
      locationType: searchParams.get("locType") || "",
      outcode: searchParams.get("outcode") || "",
      district: searchParams.get("district") || "",
      postcode: searchParams.get("postcode") || "",
      lat: searchParams.get("lat") || "",
      lng: searchParams.get("lng") || "",
      d: Number(searchParams.get("d") ?? 0),
      ageRange: [parseInt(searchParams.get("minAge")) || 18, parseInt(searchParams.get("maxAge")) || 60],
      priceRange: [parseInt(searchParams.get("minPrice")) || 0, parseInt(searchParams.get("maxPrice")) || 500],
      ethnicity: searchParams.get("eth") || "",
      bodyType: searchParams.get("body") || "",
      gender: searchParams.get("gender") || "",
      verifiedOnly: searchParams.get("verified") === "1",
      availableToday: searchParams.get("available") === "1",
      independentOnly: searchParams.get("independent") === "1",
      services: searchParams.get("services")?.split(",").filter(Boolean) || [],
    };
    const nextSort = searchParams.get("sort") || "recommended";

    // Only update if actually different (prevents extra fetch cycles)
    setFilters((prev) => {
      const changed = Object.keys(nextFilters).some((k) => {
        if (Array.isArray(nextFilters[k])) {
          return JSON.stringify(prev[k]) !== JSON.stringify(nextFilters[k]);
        }
        return prev[k] !== nextFilters[k];
      });
      return changed ? nextFilters : prev;
    });
    setSortBy((prev) => (prev !== nextSort ? nextSort : prev));
    didHydrateRef.current = true;
  }, [searchParams, locationSlug]);

  // ===== STRICT CANONICALIZATION RULES =====
  // Rule A: Path slug must match slugifyLocation(outcode, district)
  // Rule B: No location filters + locationSlug !== "gb" → redirect to gb
  // Rule C: Postcode → resolve → outcode canonical path
  // NOTE: We DON'T return early from render - instead queue redirects in useEffect
  
  useEffect(() => {
    const locType = searchParams.get("locType");
    const postcode = searchParams.get("postcode");
    const outcode = searchParams.get("outcode");
    const district = searchParams.get("district");

    // Build a key to prevent redirect loops
    const key = `${categorySlug}|${locationSlug}|${locType}|${postcode}|${outcode}|${district}|${searchParams.toString()}`;
    
    // Skip if already queued (prevent loops)
    if (pendingRedirect === key) return;

    // ===== RULE B: No location filters but locationSlug !== "gb" → redirect to gb =====
    // Exception: allow well-known city/area landing pages (e.g. /escort/london) so they
    // render as branded landing pages with hero imagery instead of being redirected away.
    const KNOWN_CITY_SLUGS = new Set([
      "london", "central-london",
      "manchester", "birmingham", "leeds", "liverpool",
      "bristol", "glasgow", "edinburgh", "cardiff", "newcastle",
    ]);
    const hasLocationFilters = locType || outcode || district || postcode;
    if (
      !hasLocationFilters &&
      locationSlug &&
      locationSlug !== "gb" &&
      !KNOWN_CITY_SLUGS.has(locationSlug)
    ) {
      setPendingRedirect(key);
      navigate(`/${categorySlug}/gb${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, { replace: true });
      return;
    }

    // ===== RULE A: Path slug must match slugifyLocation(outcode, district) =====
    if (locType === "outcode" && outcode) {
      const expectedSlug = slugifyLocation({ outcode, district: district || "" });
      if (locationSlug !== expectedSlug) {
        setPendingRedirect(key);
        navigate(`/${categorySlug}/${expectedSlug}?${searchParams.toString()}`, { replace: true });
        return;
      }
    }

    // ===== RULE C: Postcode → resolve → outcode canonical path =====
    if (locType === "postcode" && postcode && !outcode) {
      setPendingRedirect(key);
      (async () => {
        try {
          const res = await api.get(`/location/location-resolve`, { params: { postcode } });
          const data = res.data;

          if (!data?.ok || !data?.result?.outcode || !data?.result?.district) {
            setPendingRedirect(null);
            return;
          }

          const resolvedOutcode = data.result.outcode;
          const resolvedDistrict = data.result.district;
          const canonicalSlug = slugifyLocation({ outcode: resolvedOutcode, district: resolvedDistrict });

          // Rebuild query without postcode
          const next = new URLSearchParams(searchParams);
          next.set("locType", "outcode");
          next.set("outcode", resolvedOutcode);
          next.set("district", resolvedDistrict);
          next.delete("postcode");

          // Navigate to canonical path
          navigate(`/${categorySlug}/${canonicalSlug}?${next.toString()}`, { replace: true });
        } catch (e) {
          console.warn("Postcode canonical redirect failed:", e);
          setPendingRedirect(null);
        }
      })();
      // Don't return early - let page render while async resolve happens
    } else {
      // Clear pending redirect if no rule matched
      setPendingRedirect(null);
    }
  }, [searchParams, categorySlug, locationSlug, navigate, pendingRedirect]);

  // UI state
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filterSection, setFilterSection] = useState("all");

  // Refs
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // ===== URL + NAVIGATION (VivaStreet mirror: path = location, query = filters) =====
  const navigateWithFilters = useCallback(
    (nextFilters, nextSortBy) => {
      const qp = new URLSearchParams();

      if (nextFilters.keyword) qp.set("q", nextFilters.keyword);
      if (nextFilters.d > 0) qp.set("d", String(nextFilters.d)); // VivaStreet key: d

      if (nextFilters.locationType) qp.set("locType", nextFilters.locationType);
      if (nextFilters.outcode) qp.set("outcode", nextFilters.outcode);
      if (nextFilters.district) qp.set("district", nextFilters.district);
      if (nextFilters.postcode) qp.set("postcode", nextFilters.postcode);
      if (nextFilters.lat) qp.set("lat", nextFilters.lat);
      if (nextFilters.lng) qp.set("lng", nextFilters.lng);

      if (nextFilters.ageRange[0] !== 18) qp.set("minAge", String(nextFilters.ageRange[0]));
      if (nextFilters.ageRange[1] !== 60) qp.set("maxAge", String(nextFilters.ageRange[1]));
      if (nextFilters.priceRange[0] > 0) qp.set("minPrice", String(nextFilters.priceRange[0]));
      if (nextFilters.priceRange[1] < 500) qp.set("maxPrice", String(nextFilters.priceRange[1]));

      if (nextFilters.ethnicity) qp.set("eth", nextFilters.ethnicity);
      if (nextFilters.bodyType) qp.set("body", nextFilters.bodyType);
      if (nextFilters.gender) qp.set("gender", nextFilters.gender);

      if (nextFilters.verifiedOnly) qp.set("verified", "1");
      if (nextFilters.availableToday) qp.set("available", "1");
      if (nextFilters.independentOnly) qp.set("independent", "1");
      if (nextFilters.services?.length) qp.set("services", nextFilters.services.join(","));

      if (nextSortBy && nextSortBy !== "recommended") qp.set("sort", nextSortBy);

      // VivaStreet: location in PATH (not query)
      const nextPathLocation =
        nextFilters.location && nextFilters.location !== "gb" ? nextFilters.location : "gb";

      const url = `/${categorySlug}/${nextPathLocation}${qp.toString() ? `?${qp.toString()}` : ""}`;

      navigate(url, { replace: false });
    },
    [categorySlug, navigate]
  );

  // ===== FETCH PROFILES =====
  const fetchProfiles = useCallback(async (pageNum = 1, append = false) => {
    // Skip fetch if a redirect is pending (canonicalization in progress)
    if (pendingRedirect) {
      return;
    }

    if (pageNum === 1) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = {
        status: "approved",
        limit: 20,
        page: pageNum,
        category: "escort", // Only show escort ads on this page
      };

      // Apply filters
      if (filters.keyword) params.search = filters.keyword;
      if (filters.locationType) params.locType = filters.locationType;
      if (filters.outcode) params.outcode = filters.outcode;
      if (filters.district) params.district = filters.district;
      if (filters.postcode) params.postcode = filters.postcode;
      if (filters.lat) params.lat = filters.lat;
      if (filters.lng) params.lng = filters.lng;
      if (filters.location && filters.location !== "gb") params.location = filters.location;
      if (filters.d > 0) params.d = filters.d; // Use 'd' not 'distance'
      if (filters.ageRange[0] !== 18) params.minAge = filters.ageRange[0];
      if (filters.ageRange[1] !== 60) params.maxAge = filters.ageRange[1];
      if (filters.priceRange[0] > 0) params.minPrice = filters.priceRange[0];
      if (filters.priceRange[1] < 500) params.maxPrice = filters.priceRange[1];
      if (filters.ethnicity) params.ethnicity = filters.ethnicity;
      if (filters.bodyType) params.bodyType = filters.bodyType;
      if (filters.gender) params.gender = filters.gender;
      if (filters.verifiedOnly) params.verified = "1";
      if (filters.availableToday) params.available = "1";
      if (filters.independentOnly) params.independent = "1";
      if (filters.services.length) params.services = filters.services.join(",");
      if (sortBy) params.sortBy = sortBy;

      const data = await getAds(params);
      const newProfiles = data.ads || [];

      // Enrich with computed badges
      const enriched = newProfiles.map((ad) => ({
        ...ad,
        _isTrending: isTrendingAd(ad),
        _isNewArrival: isNewArrivalAd(ad),
      }));

      if (append) {
        setProfiles((prev) => [...prev, ...enriched]);
      } else {
        setProfiles(enriched);
      }

      setTotalCount(data.total || newProfiles.length);
      setHasMore(newProfiles.length === 20);
      setPage(pageNum);

      // Save search to history on first page (not appends)
      if (!append && (filters.keyword || locationSlug)) {
        saveSearch({
          keyword: filters.keyword || undefined,
          location: locationSlug || undefined,
          category: filters.category || undefined,
          sortBy: sortBy || undefined,
        }).catch(() => { /* ignore - not critical */ });
      }
    } catch (err) {
      // Retry once after 3s for Render cold starts
      if (!append && retryCountRef.current < 1) {
        retryCountRef.current += 1;
        setTimeout(() => fetchProfiles(pageNum, append), 3000);
        return;
      }
      retryCountRef.current = 0;
      showToastError("Failed to load profiles. Please try again.");
      setError(err);
      if (!append) {
        setProfiles([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy, showToastError, pendingRedirect]);

  // Initial fetch and refetch on filter/sort change
  useEffect(() => {
    fetchProfiles(1, false);
  }, [fetchProfiles]);

  // ===== INFINITE SCROLL =====
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchProfiles(page + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore, page, fetchProfiles]);

  // ===== HANDLERS =====

  // Handle filter changes (live update) - updates URL + triggers refetch
  const handleFilterChange = useCallback(
    (nextFilters) => {
      setFilters(nextFilters);
      navigateWithFilters(nextFilters, sortBy);
    },
    [navigateWithFilters, sortBy]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (newSort) => {
      setSortBy(newSort);
      navigateWithFilters(filters, newSort);
    },
    [filters, navigateWithFilters]
  );

  // Clear all filters (uses navigateWithFilters as single source of truth)
  const clearAllFilters = useCallback(() => {
    const cleared = {
      keyword: "",
      location: "gb",
      locationType: "",
      outcode: "",
      district: "",
      postcode: "",
      d: 0,
      ageRange: [18, 60],
      priceRange: [0, 500],
      ethnicity: "",
      bodyType: "",
      gender: "",
      verifiedOnly: false,
      availableToday: false,
      independentOnly: false,
      services: [],
    };
    navigateWithFilters(cleared, "recommended");
  }, [navigateWithFilters]);

  // Open filter sheet to specific section
  const handleOpenFilters = useCallback((section = "all") => {
    setFilterSection(section);
    setShowFilterSheet(true);
  }, []);

  // ===== COMPUTED VALUES =====

  // Process profiles with ranking
  const processedProfiles = useMemo(() => {
    return buildHomeLists(profiles, { sortBy }).all || profiles;
  }, [profiles, sortBy]);

  // Split VIP/Featured from regular listings (top-level for separate rendering)
  const vipProfiles = useMemo(() => {
    return processedProfiles.filter(p => p.tier === 'FEATURED' || p.tier === 'PRIORITY_PLUS');
  }, [processedProfiles]);

  const regularProfiles = useMemo(() => {
    return processedProfiles.filter(p => p.tier !== 'FEATURED' && p.tier !== 'PRIORITY_PLUS');
  }, [processedProfiles]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.keyword) count++;
    if (filters.location && filters.location !== "gb") count++;
    if (filters.d > 0) count++;
    if (filters.ageRange[0] !== 18 || filters.ageRange[1] !== 60) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) count++;
    if (filters.ethnicity) count++;
    if (filters.bodyType) count++;
    if (filters.gender) count++;
    if (filters.verifiedOnly) count++;
    if (filters.availableToday) count++;
    if (filters.independentOnly) count++;
    if (filters.services.length) count++;
    return count;
  }, [filters]);

  // Location display label
  const locationLabel = useMemo(() => {
    if (filters.outcode && filters.district) return `${filters.outcode.toUpperCase()} — ${filters.district}`;
    if (filters.district) return filters.district;
    if (filters.outcode) return filters.outcode.toUpperCase();
    if (filters.location && filters.location !== "gb") return filters.location.replace(/-/g, " ");
    return "";
  }, [filters]);

  // Location-specific hero banner — shown on every escort search results page.
  // Image is picked from a rotating pool in /images/escorts-hero/ so visitors see
  // a fresh look on each page load. Drop more JPGs into that folder + bump
  // HERO_POOL_SIZE to grow the rotation.
  const HERO_POOL_SIZE = 30; // number of files hero-01.jpg ... hero-NN.jpg in /images/escorts-hero/
  const locationHero = useMemo(() => {
    // Build a friendly title from the available location signals
    let title = "Escorts near you";
    let subtitle = "Browse verified profiles across the UK";

    const districtRaw = filters.district || "";
    const outcodeRaw = (filters.outcode || "").toUpperCase();
    const slugRaw = locationSlug && locationSlug !== "gb" ? locationSlug : "";
    const slugWords = slugRaw
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    if (districtRaw && outcodeRaw) {
      title = `Escorts in ${districtRaw}`;
      subtitle = `Verified companions near ${outcodeRaw} — ${districtRaw}`;
    } else if (districtRaw) {
      title = `Escorts in ${districtRaw}`;
      subtitle = "Verified companions in your area";
    } else if (slugWords) {
      title = `Escorts in ${slugWords}`;
      // Special-case London for richer copy
      if (/london/i.test(slugWords)) {
        subtitle = "Premium companions across the capital — from Mayfair to Canary Wharf";
      } else {
        subtitle = `Verified companions in ${slugWords}`;
      }
    } else if (outcodeRaw) {
      title = `Escorts near ${outcodeRaw}`;
      subtitle = "Verified companions in your area";
    }

    // Pick a rotating image — different on each page load.
    // Index = floor(random * pool size), 1-padded to 2 digits.
    const idx = Math.floor(Math.random() * HERO_POOL_SIZE) + 1;
    const padded = String(idx).padStart(2, "0");
    const image = `/images/escorts-hero/hero-${padded}.jpg`;

    return { image, title, subtitle };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationSlug, filters.location, filters.district, filters.outcode]);

  // Search intent confirmation (VivaStreet-style header)
  const searchIntentLabel = useMemo(() => {
    const categoryLabel = CATEGORY_LABELS[categorySlug] || "Escorts";
    
    let locationPart = "";
    if (filters.outcode && filters.district) {
      locationPart = `near ${filters.outcode.toUpperCase()} — ${filters.district}`;
    } else if (filters.outcode) {
      locationPart = `near ${filters.outcode.toUpperCase()}`;
    } else if (filters.district) {
      locationPart = `in ${filters.district}`;
    } else if (locationSlug && locationSlug !== "gb") {
      locationPart = `in ${locationSlug.replace(/-/g, " ")}`;
    }
    
    const distancePart = filters.d > 0 ? ` · within ${filters.d} miles` : "";
    
    return { categoryLabel, locationPart, distancePart };
  }, [categorySlug, filters.outcode, filters.district, filters.d, locationSlug]);

  // Suggested nearby locations (for empty state)
  const suggestedLocations = useMemo(() => [
    { name: "Central London", slug: "central-london" },
    { name: "Manchester", slug: "manchester" },
    { name: "Birmingham", slug: "birmingham" },
    { name: "Leeds", slug: "leeds" },
  ], []);

  // Suggested distance expansions (for smart empty state)
  // Only show when d < 20 and we have a location selected
  const suggestedDistances = useMemo(() => {
    const current = filters.d || 0;
    // Only suggest expansion if current search is under 20 miles
    if (current >= 20) return [];
    return [10, 20, 50].filter(d => d > current);
  }, [filters.d]);

  // ===== RENDER =====
  return (
    <div className="relative min-h-screen text-zinc-800 dark:text-zinc-200">
      {/* Glassy luxury page background — deep navy at the very top (where
          the hero lives), fading through a warm midtone into a soft cream
          near the listings. Matches the Privara-style premium look. */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#0b1220] via-[#1a1015] via-40% to-[#fff5ec] dark:from-[#070a12] dark:via-[#1a1015] dark:to-[#1a1015]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(255,180,140,0.18),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(244,194,212,0.35),transparent_60%)]" />

      {/* Age Gate - shown once per session for adult categories */}
      <AgeGateModal />

      {/* NAVBAR */}
      <Navbar />

      {/* HERO + SEARCH BAR — image is a single backdrop that fades through
          the search bar and on into the listings area */}
      {locationHero && (
        <div className="relative">
          {/* Banner image as a tall backdrop that extends well past the
              search bar so the fade dissolves OVER it and partially over
              the listings below. Pointer-events-none so clicks pass through
              to the search/cards. */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[820px] sm:h-[780px] md:h-[720px] lg:h-[680px] overflow-hidden"
            aria-hidden="true"
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.3) 86%, rgba(0,0,0,0.12) 95%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.3) 86%, rgba(0,0,0,0.12) 95%, transparent 100%)",
            }}
          >
            <img
              src={locationHero.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 30%" }}
              loading="eager"
              decoding="async"
            />
            {/* Deep luxury vignette: dark navy at top corners + dark left side
                (Privara-style) so the hero feels cinematic and the title pops */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b1220]/80 via-[#0b1220]/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220]/40 via-transparent to-transparent" />
            {/* Warm bottom blend — image dissolves through warm rose tones
                so the transition from dark hero to the lighter page below
                feels gradual and on-brand */}
            <div className="absolute inset-x-0 bottom-0 h-[280px] bg-gradient-to-t from-[#3a1a20]/70 via-[#3a1a20]/30 to-transparent" />
          </div>

          {/* Hero text — sits in normal flow above the backdrop */}
          <section
            className="relative w-full"
            aria-label={locationHero.title}
          >
            <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-20 sm:pt-24 md:pt-32 lg:pt-36 pb-28 sm:pb-32 md:pb-40 lg:pb-48">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-pink-300/90">
                  Featured location
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] leading-[1.05] tracking-tight">
                {locationHero.title}
              </h1>
              <p className="mt-4 text-sm sm:text-base md:text-lg text-white/80 max-w-2xl drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] line-clamp-2 font-light tracking-wide">
                {locationHero.subtitle}
              </p>
            </div>
          </section>

          {/* SEARCH BAR — overlaps the fade zone of the backdrop */}
          <section className="relative px-3 md:px-4 pb-6 md:pb-10 -mt-12 md:-mt-16">
            <div className="max-w-7xl mx-auto">
              <SearchCardVivaStreet
                defaultCategorySlug={categorySlug}
                defaultLocationSlug={locationSlug}
                defaultDistance={filters.d}
                loadLastLocation={true}
                compact
              />
            </div>
          </section>
        </div>
      )}

      {/* Fallback search bar when there's no hero (no location selected) */}
      {!locationHero && (
        <section className="relative px-3 md:px-4 py-3 md:py-4">
          <div className="max-w-7xl mx-auto">
            <SearchCardVivaStreet
              defaultCategorySlug={categorySlug}
              defaultLocationSlug={locationSlug}
              defaultDistance={filters.d}
              loadLastLocation={true}
              compact
            />
          </div>
        </section>
      )}

      {/* ===== VIP & FEATURED SHOWCASE (Always top, maximum visibility) ===== */}
      {!loading && vipProfiles.length > 0 && (
        <section className="relative overflow-hidden">
          {/* Premium gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-50 via-yellow-50/80 to-pink-50 dark:from-amber-950/30 dark:via-zinc-900 dark:to-pink-950/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.15),transparent_60%)]" />
          
          {/* Subtle top/bottom borders */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />

          <div className="relative max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md shadow-amber-400/30">
                  <span className="text-sm md:text-base">⭐</span>
                </div>
                <div>
                  <h2 className="text-sm md:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-600 to-pink-600">
                    VIP & Featured
                  </h2>
                  <p className="text-[10px] md:text-xs text-amber-600/70 font-medium -mt-0.5 hidden sm:block">Premium verified profiles</p>
                </div>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-amber-700/60 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200/60">
                {vipProfiles.length} {vipProfiles.length === 1 ? 'listing' : 'listings'}
              </span>
            </div>

            {/* VIP Horizontal Scroll on mobile, Grid on desktop */}
            <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0 md:grid md:grid-cols-3 lg:grid-cols-4 snap-x snap-mandatory scrollbar-none -mx-3 px-3 md:mx-0 md:px-0">
              {vipProfiles.map((profile, index) => (
                <div key={profile._id} className="min-w-[45%] sm:min-w-[40%] md:min-w-0 snap-start">
                  <SearchResultCard
                    profile={profile}
                    index={index}
                    onQuickView={handleQuickView}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SEARCH INTENT CONFIRMATION (VivaStreet-style) */}
      {(searchIntentLabel.locationPart || searchIntentLabel.distancePart) && (
        <section className="px-4 py-2 bg-gradient-to-r from-pink-50 to-purple-50 border-y border-pink-100">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm font-medium text-zinc-700">
              <span className="font-bold text-pink-600">{searchIntentLabel.categoryLabel}</span>
              {searchIntentLabel.locationPart && (
                <span className="text-zinc-600"> {searchIntentLabel.locationPart}</span>
              )}
              {searchIntentLabel.distancePart && (
                <span className="text-zinc-500">{searchIntentLabel.distancePart}</span>
              )}
            </p>
          </div>
        </section>
      )}

      {/* ACTIVE FILTER CHIPS (VivaStreet-style removable chips) */}
      {activeFilterCount > 0 && (
        <section className="px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto">
            <ActiveFilterChips
              filters={filters}
              locationLabel={locationLabel}
              onRemoveFilter={(key, value) => {
                const updated = { ...filters };
                // Handle different filter types
                if (key === "location") {
                  updated.location = "gb";
                  updated.locationType = "";
                  updated.outcode = "";
                  updated.district = "";
                  updated.postcode = "";
                } else if (key === "d") {
                  updated.d = 0;
                } else if (key === "verifiedOnly" || key === "availableToday" || key === "independentOnly") {
                  updated[key] = false;
                } else if (key === "services") {
                  updated.services = filters.services.filter((s) => s !== value);
                } else if (key === "ageRange") {
                  updated.ageRange = [18, 60];
                } else if (key === "priceRange") {
                  updated.priceRange = [0, 500];
                } else if (key === "keyword") {
                  updated.keyword = "";
                } else if (typeof updated[key] === "string") {
                  updated[key] = "";
                }
                handleFilterChange(updated);
              }}
              onClearAll={clearAllFilters}
            />
          </div>
        </section>
      )}

      {/* MOBILE FILTER BAR */}
      <div className="lg:hidden">
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onOpenMore={handleOpenFilters}
          activeCount={activeFilterCount}
          locationLabel={locationLabel}
        />
      </div>

      {/* RESULTS HEADER: Count + Sort */}
      <section className="px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-zinc-400">Searching...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-zinc-900 dark:text-white">{totalCount}</span>
                <span className="text-sm text-zinc-500">
                  profiles found
                  {locationLabel && (
                    <span className="text-zinc-400"> near <span className="font-medium text-zinc-600">{locationLabel}</span></span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <SortDropdown
            value={sortBy}
            onChange={handleSortChange}
            compact={false}
          />
        </div>
      </section>

      {/* MAIN CONTENT: Sidebar + Results */}
      <section className="px-4 pb-32 lg:pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <div className="max-w-[1400px] mx-auto flex gap-8 items-start pt-6">
          {/* DESKTOP SIDEBAR */}
          <div className="hidden lg:block w-80 shrink-0 sticky top-24 self-start">
            <div className="bg-white dark:bg-zinc-800/60 rounded-2xl shadow-sm border border-zinc-200/60 dark:border-zinc-700 p-5 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-xl">⚡</span> Filters
              </h3>
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClear={clearAllFilters}
                loading={loading}
              />
            </div>
          </div>

          {/* RESULTS GRID */}
          <div className="flex-1 min-w-0">
            {/* Error State */}
            {error && !loading && (
              <EmptyState type="error" />
            )}

            {/* Loading State */}
            {loading && (
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Empty State with Smart Distance Expansion */}
            {!loading && !error && processedProfiles.length === 0 && (
              <div className="text-center py-16 space-y-8">
                <EmptyState
                  type="no-results"
                  location={locationLabel}
                  onClearFilters={clearAllFilters}
                  suggestedLocations={suggestedLocations}
                />
                
                {/* Smart Distance Expansion (VivaStreet-style) */}
                {/* Shows when: has location filter + current distance < 20 miles */}
                {suggestedDistances.length > 0 && (filters.outcode || filters.district) && (
                  <div className="bg-gradient-to-r from-pink-50 via-white to-purple-50 rounded-2xl p-6 max-w-md mx-auto border border-pink-100 shadow-sm">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-xl">🔍</span>
                      <p className="text-sm font-semibold text-zinc-700">
                        No results nearby? Try expanding your search:
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {suggestedDistances.map((dist) => (
                        <button
                          key={dist}
                          onClick={() => handleFilterChange({ ...filters, d: dist })}
                          className="px-5 py-2.5 text-sm font-semibold rounded-xl
                                   bg-white border-2 border-pink-200 text-pink-600
                                   hover:bg-pink-50 hover:border-pink-400 hover:scale-105
                                   active:scale-95 transition-all shadow-sm"
                        >
                          Search within {dist} miles
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-400 mt-4">
                      Currently searching within {filters.d || 0} miles of {filters.outcode || filters.district}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Loading Skeletons */}
            {loading && !error && (
              <div className="mt-4">
                <GallerySkeletons />
              </div>
            )}

            {/* Results Grid (Regular listings only — VIP is above) */}
            {!loading && !error && regularProfiles.length > 0 && (
              <>
                <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {regularProfiles.map((profile, index) => (
                    <SearchResultCard
                      key={profile._id}
                      profile={profile}
                      index={vipProfiles.length + index}
                      onQuickView={handleQuickView}
                    />
                  ))}
                </div>

                {/* Load More / End of Results */}
                <div ref={loadMoreRef}>
                  <LoadMoreButton
                    loading={loadingMore}
                    hasMore={hasMore}
                    total={totalCount}
                    loaded={processedProfiles.length}
                    onLoadMore={() => fetchProfiles(page + 1, true)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Global Quick View Modal */}
      <ProfileQuickViewModal 
        profile={quickViewProfile} 
        isOpen={isQuickViewOpen} 
        onClose={handleCloseQuickView} 
      />

      {/* MOBILE BOTTOM BAR */}
      <nav className="fixed left-1/2 -translate-x-1/2 bottom-4 w-[min(420px,calc(100%-32px))]
                      rounded-2xl bg-white/95 p-1.5 shadow-2xl shadow-black/15 backdrop-blur-xl border border-zinc-200/80
                      flex gap-1.5 lg:hidden z-50 pb-safe">
        {/* Home */}
        <a
          href="/"
          className="flex-1 rounded-xl px-3 py-3 text-center font-semibold text-sm
                     bg-zinc-50 text-zinc-700 hover:bg-zinc-100
                     active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </a>

        {/* Filters */}
        <button
          type="button"
          onClick={() => handleOpenFilters("all")}
          className="flex-1 rounded-xl px-3 py-3 text-center font-bold text-sm relative
                     bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25
                     active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-pink-600 text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Post */}
        <a
          href="/create-ad"
          className="flex-1 rounded-xl px-3 py-3 text-center font-semibold text-sm
                     bg-zinc-50 text-zinc-700 hover:bg-zinc-100
                     active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <span className="text-lg">+</span>
          Post
        </a>
      </nav>

      {/* FILTER BOTTOM SHEET (Mobile) */}
      <FilterBottomSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filters={filters}
        onFiltersChange={handleFilterChange}
        onApply={() => {
          // Apply uses current filters (already synced via handleFilterChange)
          setShowFilterSheet(false);
          navigateWithFilters(filters, sortBy);
        }}
        onClear={clearAllFilters}
        section={filterSection}
      />
    </div>
  );
}
