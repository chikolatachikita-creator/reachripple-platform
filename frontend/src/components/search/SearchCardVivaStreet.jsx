import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Navigation, X, ChevronDown } from "lucide-react";
import api from "../../api/client";

/**
 * VivaStreet-style URL utility functions
 * Used to generate canonical URL slugs for location-based routing
 */

/**
 * Slugify a location object into a URL-friendly path segment
 * Examples:
 *   { outcode: "N1", district: "Islington" } => "n1-islington"
 *   { outcode: "SW1A", district: "" } => "sw1a"
 *   { outcode: "", district: "London" } => "london"
 * 
 * @param {Object} location - Location object with outcode and district
 * @returns {string} URL-friendly slug
 */
export function slugifyLocation({ outcode = "", district = "" }) {
  const parts = [];
  
  if (outcode && typeof outcode === "string") {
    parts.push(outcode.toLowerCase().trim());
  }
  
  if (district && typeof district === "string") {
    // Convert district to slug: "St. John's Wood" => "st-johns-wood"
    const districtSlug = district
      .toLowerCase()
      .trim()
      .replace(/['']/g, "") // Remove apostrophes
      .replace(/\./g, "")   // Remove periods
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dashes
      .replace(/^-+|-+$/g, ""); // Trim leading/trailing dashes
    
    if (districtSlug) {
      parts.push(districtSlug);
    }
  }
  
  // If no parts, return "gb" as default (UK-wide)
  if (parts.length === 0) {
    return "gb";
  }
  
  return parts.join("-");
}

/**
 * Build a VivaStreet-style path with query parameters
 * 
 * @param {Object} options - Path building options
 * @param {string} options.categorySlug - Category (e.g., "escorts")
 * @param {string} options.locationSlug - Location slug from slugifyLocation()
 * @param {Object} options.params - Query parameters to append
 * @returns {string} Full path with query string
 */
export function buildVivaStreetPath({ 
  categorySlug = "escorts", 
  locationSlug = "gb", 
  params = {} 
}) {
  // Build base path
  const basePath = `/${categorySlug}/${locationSlug}`;
  
  // Filter out empty/null/undefined params
  const validParams = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  
  if (validParams) {
    return `${basePath}?${validParams}`;
  }
  
  return basePath;
}

/**
 * VivaStreet-mirror Search Card: Location (postcode/outcode) + Distance miles
 *
 * URL pattern:
 *   /escort/:locationSlug?d=10&locType=outcode&outcode=N1&district=Islington
 *   /escort/:locationSlug?d=10&locType=postcode&postcode=N1%206XW
 *
 * Notes:
 * - "locationSlug" is the PATH segment (VivaStreet style).
 * - Other filters stay in query string (d, type, etc).
 *
 * Props:
 * - categorySlug: e.g. "escort" (default)
 * - onNavigate: (url: string) => void  // optional; if omitted, uses useNavigate
 * - defaultDistance: number (miles)
 * - loadLastLocation: boolean (preload from localStorage)
 */

// Storage key for last location (shared with VivaLocationAutocomplete)
const STORAGE_KEY = 'viva_last_location';

export default function SearchCardVivaStreet({
  categorySlug = "escort",
  onNavigate,
  defaultDistance = 0,
  loadLastLocation = true,
  compact = false,
}) {
  const navigateHook = useNavigate();
  const [locText, setLocText] = useState("");
  const [distance, setDistance] = useState(defaultDistance);

  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [highlight, setHighlight] = useState(-1);
  const [loading, setLoading] = useState(false);

  // picked value drives routing
  const [picked, setPicked] = useState(null);

  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const abortRef = useRef(null);
  const cacheRef = useRef(new Map()); // q -> results

  // Load last location from localStorage on mount
  useEffect(() => {
    if (loadLastLocation) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const lastLoc = JSON.parse(stored);
          if (lastLoc?.outcode) {
            const label = lastLoc.label || `${lastLoc.outcode} — ${lastLoc.district || lastLoc.ward || ''}`;
            setLocText(label);
            setPicked(lastLoc);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadLastLocation]);

  const distances = useMemo(
    () => [
      { label: "0 miles (Exact)", value: 0 },
      { label: "+ ¼ mile", value: 0.25 },
      { label: "+ ½ mile", value: 0.5 },
      { label: "+ 1 mile", value: 1 },
      { label: "+ 2 miles", value: 2 },
      { label: "+ 3 miles", value: 3 },
      { label: "+ 5 miles", value: 5 },
      { label: "+ 10 miles", value: 10 },
      { label: "+ 20 miles", value: 20 },
      { label: "+ 50 miles", value: 50 },
    ],
    []
  );

  function performNavigate(url) {
    if (onNavigate) {
       onNavigate(url);
    } else {
       navigateHook(url);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
    setHighlight(-1);
  }

  function openMenu() {
    if (items.length) setMenuOpen(true);
  }

  function clearPicked() {
    setPicked(null);
  }

  function setPickedItem(it) {
    setPicked(it.value);
    // Use "N1 — Islington" format for display
    const displayLabel = it.displayLabel || `${it.value.outcode} — ${it.value.district || it.value.ward || ''}`;
    setLocText(displayLabel);
    closeMenu();
    
    // Save to localStorage
    try {
      const locationData = { ...it.value, label: displayLabel };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locationData));
    } catch {
      // Ignore storage errors
    }
  }

  // Debounced fetch
  useEffect(() => {
    const q = locText.trim().toUpperCase().replace(/\s+/g, " ");

    if (q.length < 1) {
      setItems([]);
      closeMenu();
      setLoading(false);
      return;
    }

    const cached = cacheRef.current.get(q);
    if (cached) {
      setItems(cached);
      setLoading(false);
      setMenuOpen(cached.length > 0); // Only open if results exist
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);

        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const r = await api.get(`/location/location-suggest`, {
          params: { q },
          signal: ctrl.signal,
        });
        const j = r.data;

        // Extract results - handle both new and legacy response formats
        let results = [];
        if (Array.isArray(j?.results)) {
          results = j.results;
        } else if (j?.results && typeof j.results === 'object') {
          results = Object.values(j.results).flat();
        }
        
        // Ensure all results have required fields with sensible defaults
        const normalizedResults = results.map((item) => ({
          label: item.label || `${item.outcode || ''} ${item.district || item.ward || ''}`.trim(),
          displayLabel: item.displayLabel || item.label,
          value: {
            locType: item.value?.locType || 'outcode',
            outcode: item.value?.outcode || item.outcode || '',
            district: item.value?.district || item.district || '',
            ward: item.value?.ward || item.ward || '',
            postcode: item.value?.postcode || item.postcode || '',
            locationSlug: item.value?.locationSlug || item.locationSlug || 'gb',
            type: item.value?.type || 'outcode',
          },
          meta: item.meta || (item.district || item.ward || 'Location'),
        }));

        cacheRef.current.set(q, normalizedResults);
        setItems(normalizedResults);
        setMenuOpen(normalizedResults.length > 0);
        setHighlight(-1); // Reset highlight when new results arrive
      } catch (e) {
        if (String(e?.name) !== "AbortError") {
          console.error('Location search error:', e);
          setItems([]);
          closeMenu();
        }
      } finally {
        setLoading(false);
      }
    }, 150); // Reduced debounce from 180 to 150ms for faster response

    return () => clearTimeout(t);
  }, [locText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside
  useEffect(() => {
    function onDocClick(e) {
      const input = inputRef.current;
      const menu = menuRef.current;
      if (!input || !menu) return;
      if (e.target === input) return;
      if (menu.contains(e.target)) return;
      closeMenu();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Keyboard nav
  function onKeyDown(e) {
    if (!menuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      openMenu();
      return;
    }

    if (!menuOpen) {
      if (e.key === "Enter") {
        e.preventDefault();
        runSearch();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && items[highlight]) {
        setPickedItem(items[highlight]);
      } else {
        runSearch();
      }
      return;
    }
  }

  async function ensurePostcodeResolvedIfNeeded() {
    const raw = locText.trim().toUpperCase().replace(/\s+/g, " ");
    const compact = raw.replace(" ", "");
    const looksFullPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact);

    if (picked || !looksFullPostcode) return picked;

    try {
      setLoading(true);
      const r = await api.get(`/location/location-resolve`, {
        params: { postcode: compact },
      });
      const j = r.data;
      if (j?.ok && j?.value?.locationSlug) {
        const v = j.value;
        setPicked(v);
        return v;
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
    return picked;
  }

  function buildUrl(v) {
    const locSlug = v?.locationSlug || "gb"; // All UK fallback
    const qs = new URLSearchParams();
    qs.set("d", String(distance));
    if (v?.type) qs.set("locType", v.type);
    if (v?.outcode) qs.set("outcode", v.outcode);
    if (v?.district) qs.set("district", v.district);
    if (v?.postcode) qs.set("postcode", v.postcode);
    return `/${encodeURIComponent(categorySlug)}/${encodeURIComponent(locSlug)}?${qs.toString()}`;
  }

  async function runSearch() {
    const v = await ensurePostcodeResolvedIfNeeded();
    performNavigate(buildUrl(v));
  }

  // Responsive classes based on compact mode
  const inputHeight = compact ? 'h-10 md:h-11' : 'h-12 md:h-14';
  const wrapperPadding = compact ? 'p-1.5 md:p-2' : 'p-2 md:p-3';
  const wrapperRadius = compact ? 'rounded-2xl' : 'rounded-3xl';
  const inputRadius = compact ? 'rounded-xl' : 'rounded-2xl';
  const fontSize = compact ? 'text-sm' : 'text-sm md:text-base';
  const iconSize = compact ? 16 : 20;

  return (
    <div className="w-full relative z-30">
        <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md ${wrapperRadius} ${wrapperPadding} shadow-xl border border-white/50 dark:border-zinc-700/50 flex flex-row gap-1.5 md:gap-3 items-center`}>
            
            {/* Location Input Group */}
            <div className="relative flex-1 min-w-0 z-40">
                <div className={`absolute ${compact ? 'left-3' : 'left-4'} top-1/2 -translate-y-1/2 text-zinc-400`}>
                    <MapPin size={iconSize} />
                </div>
                <input
                    ref={inputRef}
                    value={locText}
                    onChange={(e) => {
                        setLocText(e.target.value);
                        if (picked) clearPicked();
                    }}
                    onFocus={() => { if (items.length) setMenuOpen(true); }}
                    onKeyDown={onKeyDown}
                    placeholder={compact ? "Area or postcode" : "Search UK area (e.g. N1, Manchester)"}
                    className={`w-full ${inputHeight} ${compact ? 'pl-9 pr-8' : 'pl-12 pr-10'} ${inputRadius} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-zinc-800 dark:text-zinc-100 font-medium placeholder:text-zinc-400 ${fontSize} transition-all shadow-inner`}
                    autoComplete="off"
                    spellCheck={false}
                    role="combobox"
                    aria-expanded={menuOpen}
                    aria-controls="locMenu"
                />
                
                {/* Clear / Loading Indicator */}
                <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {loading ? (
                        <div className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} border-2 border-pink-500 border-t-transparent rounded-full animate-spin`} />
                    ) : locText ? (
                        <button
                            onClick={() => {
                                setLocText("");
                                setItems([]);
                                closeMenu();
                                clearPicked();
                                inputRef.current?.focus();
                            }}
                            className="p-0.5 md:p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <X size={compact ? 14 : 16} />
                        </button>
                    ) : null}
                </div>

                {/* Dropdown Menu */}
                {menuOpen && items.length > 0 && (
                    <div
                        id="locMenu"
                        ref={menuRef}
                        className={`absolute left-0 right-0 top-[calc(100%+8px)] bg-white dark:bg-zinc-800 ${inputRadius} shadow-2xl border border-zinc-100 dark:border-zinc-700 overflow-hidden max-h-[350px] overflow-y-auto animate-fade-in-down z-50 py-2 custom-scrollbar`}
                    >
                        {items.map((it, i) => (
                            <button
                                key={`${it.label}-${i}`}
                                onClick={() => setPickedItem(it)}
                                onMouseEnter={() => setHighlight(i)}
                                className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors ${
                                    i === highlight 
                                        ? 'bg-pink-50 dark:bg-white/5' 
                                        : 'hover:bg-zinc-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <span className="font-semibold text-zinc-800 dark:text-gray-200 text-sm">
                                    {it.label}
                                </span>
                                {it.meta && (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {it.meta}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Distance Select */}
            <div className={`relative ${compact ? 'w-auto min-w-[90px] md:min-w-[140px]' : 'w-full md:w-auto min-w-[140px]'} z-30`}>
                <div className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Navigation size={compact ? 14 : 18} />
                </div>
                <select
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className={`w-full ${inputHeight} ${compact ? 'pl-8 pr-6 md:pl-10 md:pr-8' : 'pl-10 pr-8'} ${inputRadius} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-zinc-800 dark:text-zinc-100 font-medium ${fontSize} appearance-none cursor-pointer transition-all shadow-inner`}
                >
                    {distances.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                </select>
                <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                    <ChevronDown size={compact ? 14 : 16} />
                </div>
            </div>

            {/* Search Button */}
            <div className={`${compact ? 'w-auto' : 'w-full md:w-auto'} z-30`}>
                <button
                    onClick={runSearch}
                    disabled={loading}
                    className={`${compact ? 'w-auto' : 'w-full md:w-auto'} ${inputHeight} ${compact ? 'px-4 md:px-6' : 'px-8'} ${inputRadius} bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold ${fontSize} shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 md:gap-2`}
                >
                    <Search size={iconSize} strokeWidth={2.5} />
                    {!compact && <span>Search</span>}
                    {compact && <span className="hidden md:inline">Search</span>}
                </button>
            </div>
        </div>

        {/* Helper Text (hidden in compact mode) */}
        {!compact && (
            <div className="mt-3 px-2 flex flex-wrap gap-4 text-xs font-medium text-zinc-500/80 dark:text-zinc-400">
                 <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500/50" />
                    Try "N1", "Soho", or "SW1"
                 </div>
                 <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                    Results update instantly
                 </div>
            </div>
        )}
    </div>
  );
}
