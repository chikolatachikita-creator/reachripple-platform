import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, X, ChevronDown, Filter } from "lucide-react";
import api from "../../api/client";

// Add styles for range inputs
const rangeStyles = `
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    outline: none;
    background: transparent;
  }
  
  /* Webkit Track (Chrome/Safari) */
  input[type="range"]::-webkit-slider-runnable-track {
    width: 100%;
    height: 6px;
    background: rgba(229, 231, 235, 0.5); /* gray-200/50 */
    border-radius: 3px;
  }
  
  /* Firefox Track */
  input[type="range"]::-moz-range-track {
    width: 100%;
    height: 6px;
    background: rgba(229, 231, 235, 0.5);
    border-radius: 3px;
  }

  /* Thumb Styles */
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    border: 2px solid currentColor;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    margin-top: -6px; /* center on track */
    transition: transform 0.1s ease;
  }
  
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    border: 2px solid currentColor;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition: transform 0.1s ease;
  }

  /* Specific Colors */
  input[type="range"].distance-slider::-webkit-slider-thumb {
    border-color: #db2777; /* brand-600 */
    color: #db2777;
  }
  
  input[type="range"].distance-slider::-webkit-slider-runnable-track {
    background: linear-gradient(to right, #ec4899, #db2777); 
  }
`;

const STORAGE_KEY = "viva_last_location";

const BODY_TYPES = [
  { value: "", label: "Any Body Type" },
  { value: "slim", label: "Slim" },
  { value: "athletic", label: "Athletic" },
  { value: "curvy", label: "Curvy" },
  { value: "bbw", label: "BBW" },
];

const GENDERS = [
  { value: "", label: "All Genders" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "trans", label: "Trans" },
];

export default function HeroSearchBar({ categorySlug = "escorts", defaultDistance = 10 }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [distance, setDistance] = useState(defaultDistance);
  
  // Advanced filters
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [gender, setGender] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Location autocomplete state
  const [menuOpen, setMenuOpen] = useState(false);
  const [locationItems, setLocationItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickedLocation, setPickedLocation] = useState(null); // { outcode, district, etc }

  // Load last location
  useEffect(() => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const lastLoc = JSON.parse(stored);
             // Support legacy string format or new object format
            if (typeof lastLoc === 'string') {
                setLocation(lastLoc);
            } else if (lastLoc && lastLoc.label) {
                setLocation(lastLoc.label);
                setPickedLocation(lastLoc);
            }
        }
    } catch(e) { /* ignore */ }
  }, []);

  // Real API Fetch for Location
  useEffect(() => {
    const q = location.trim().toUpperCase().replace(/\s+/g, " ");
    // Don't search if we just picked something (avoid loop)
    if (pickedLocation && location === pickedLocation.label) return;

    // Show suggestions as soon as 1 character is typed
    if (q.length < 1) {
      setLocationItems([]);
      setMenuOpen(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/location/location-suggest', { params: { q } });
        const j = res.data;

        let results = [];
        if (Array.isArray(j?.results)) {
            results = j.results;
        } else if (j?.results && typeof j.results === 'object') {
            results = Object.values(j.results).flat();
        }

        // Format label as 'OUTCODE - Ward/District' (e.g., 'N17 - Tottenham')
        const normalized = results.map(item => ({
          label: item.outcode && (item.ward || item.district)
            ? `${item.outcode} - ${item.ward || item.district}`
            : item.label || `${item.outcode} ${item.district || ''}`.trim(),
          value: item.value || item,
          meta: item.meta || item.district || 'Location'
        })).slice(0, 8); // Limit to 8 suggestions

        setLocationItems(normalized);
        setMenuOpen(normalized.length > 0);
      } catch (err) {
        console.error("Location suggest error", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [location, pickedLocation]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!inputRef.current || !menuRef.current) return;
      if (e.target === inputRef.current) return;
      if (menuRef.current.contains(e.target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectLocation = (item) => {
    setLocation(item.label);
    setPickedLocation({ ...item.value, label: item.label });
    
    // Persist
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...item.value, label: item.label }));
    } catch(e) {}
    
    setMenuOpen(false);
  };

  const handleSearch = () => {
    // 1. Determine location path segment
    let pathLoc = "gb"; // Default
    const v = pickedLocation;

    if (v && v.locationSlug) {
        pathLoc = v.locationSlug;
    } else if (location.trim()) {
        // Fallback if typed but not picked (basic slugify attempt or just use 'gb' and let query handle it)
        // Better to try to use the typed text as keyword if no location match? 
        // For now, default to 'gb' if not resolved, and pass location text as query might be safer?
        // But VivaStreet model prefers path. Let's assume 'gb' and pass params.
    }

    // 2. Build Query Params
    const params = new URLSearchParams();

    if (keywords) params.append("q", keywords);
    if (distance > 0) params.append("d", distance);

    // Pass detailed location data if we have it
    if (v) {
        if (v.locType) params.append("locType", v.locType);
        if (v.outcode) params.append("outcode", v.outcode);
        if (v.district) params.append("district", v.district);
        if (v.postcode) params.append("postcode", v.postcode);
    } else if (location.trim()) {
        // Fallback for raw text input which failed/wasn't picked
        // Maybe try to resolve it server side on search page?
        // or just pass as 'q' if keywords empty?
        if (!keywords && !v) params.append("q", location);
    }

    if (minAge !== 18) params.append("minAge", minAge);
    if (maxAge !== 60) params.append("maxAge", maxAge);
    if (gender) params.append("gender", gender);
    if (bodyType) params.append("body", bodyType);

    const qs = params.toString();
    const targetCategory = categorySlug || "escorts";
    navigate(`/${targetCategory}/${pathLoc}${qs ? `?${qs}` : ""}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setLocation("");
    setPickedLocation(null);
    setKeywords("");
    setDistance(defaultDistance);
    inputRef.current?.focus();
  };

  return (
    <>
      <style>{rangeStyles}</style>
      <div className="w-full relative z-30">
        
        {/* Main Bar */}
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-3 shadow-2xl border border-white/50 dark:border-zinc-700/50 transition-all duration-300 hover:shadow-pink-500/5">
            
            <div className="flex flex-col lg:flex-row gap-3">
                
                {/* Keywords */}
                <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-pink-500 transition-colors">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="What are you looking for?"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-14 pl-12 pr-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-800 dark:text-zinc-100 font-medium"
                    />
                    <label className="absolute -top-2.5 left-4 bg-white dark:bg-zinc-900 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 group-focus-within:text-pink-500 transition-colors rounded">
                        Keywords
                    </label>
                </div>

                {/* Location */}
                <div className="flex-[1.2] relative group z-50">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-pink-500 transition-colors">
                        <MapPin size={20} />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="UK City, District or Postcode"
                        value={location}
                        onChange={(e) => {
                            setLocation(e.target.value);
                            setPickedLocation(null); // Clear picked if typing
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => locationItems.length > 0 && setMenuOpen(true)}
                        className="w-full h-14 pl-12 pr-10 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-800 dark:text-zinc-100 font-medium"
                    />
                    <label className="absolute -top-2.5 left-4 bg-white dark:bg-zinc-900 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 group-focus-within:text-pink-500 transition-colors rounded">
                        Location
                    </label>

                    {/* Clear Button */}
                    {location && (
                        <button 
                            onClick={handleClear}
                            className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            <X size={16} />
                        </button>
                    )}

                    {/* Validated Indicator */}
                    {pickedLocation && (
                         <div className="absolute right-3 top-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" title="Location verified" />
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    )}

                    {/* Dropdown */}
                    {menuOpen && (
                        <div
                            ref={menuRef}
                            className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden max-h-[320px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 scrollbar-thin scrollbar-thumb-zinc-200"
                        >
                            {locationItems.map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => selectLocation(item)}
                                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 border-b border-zinc-100/50 dark:border-zinc-800 last:border-0 transition-colors flex flex-col gap-0.5"
                                >
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm">{item.label}</span>
                                    {item.meta && <span className="text-xs text-zinc-400">{item.meta}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Search Button */}
                <button
                    onClick={handleSearch}
                    className="h-14 px-8 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-lg shadow-lg shadow-pink-500/30 hover:shadow-pink-500/40 active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[140px]"
                >
                    <Search size={22} strokeWidth={2.5} />
                    Search
                </button>
            </div>

            {/* Bottom Row: Filters (Distance, Age, Etc) */}
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                
                {/* Distance Slider */}
                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-black/20 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Distance:</span>
                    <input
                        type="range"
                        min="0"
                        max="50"
                        step="5"
                        value={distance}
                        onChange={(e) => setDistance(Number(e.target.value))}
                        className="distance-slider w-24 h-1.5 cursor-pointer accent-pink-500"
                    />
                    <span className="font-bold text-pink-600 min-w-[3ch] text-right">{distance}</span>
                    <span className="text-xs">mi</span>
                </div>

                {/* Advanced Toggle */}
                <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${showAdvanced ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-transparent border-transparent hover:bg-zinc-50'}`}
                >
                    <Filter size={14} />
                    <span className="font-semibold">{showAdvanced ? 'Hide Filters' : 'More Filters'}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvanced && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
                    <select 
                        value={gender} 
                        onChange={e => setGender(e.target.value)}
                        className="h-10 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm outline-none focus:border-pink-500"
                    >
                        {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>

                    <select 
                        value={bodyType} 
                        onChange={e => setBodyType(e.target.value)}
                        className="h-10 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm outline-none focus:border-pink-500"
                    >
                        {BODY_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                    
                    {/* Simple Age Inputs */}
                    <div className="flex items-center gap-2 bg-zinc-50 px-3 rounded-xl border border-zinc-200">
                        <span className="text-xs text-zinc-400">Age:</span>
                        <input 
                            type="number" 
                            value={minAge} 
                            onChange={e => setMinAge(Number(e.target.value))}
                            className="w-8 bg-transparent text-sm font-semibold outline-none text-center"
                        />
                        <span className="text-zinc-300">-</span>
                        <input 
                            type="number" 
                            value={maxAge} 
                            onChange={e => setMaxAge(Number(e.target.value))}
                            className="w-8 bg-transparent text-sm font-semibold outline-none text-center"
                        />
                    </div>
                </div>
            )}

        </div>
      </div>
    </>
  );
}
