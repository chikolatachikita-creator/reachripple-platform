import React, { useEffect, useRef } from "react";
import { ETHNICITIES, BODY_TYPES } from "../utils/constants";

/**
 * FilterBottomSheet Component - Mobile-friendly filter drawer
 * 
 * Opens from the bottom of the screen, swipeable to dismiss
 * Follows iOS/Android bottom sheet patterns for familiar UX
 * 
 * @param {boolean} isOpen - Controls visibility
 * @param {Function} onClose - Called when sheet is dismissed
 * @param {Object} filters - Current filter values
 * @param {Function} onFiltersChange - Called when filters change
 * @param {Function} onApply - Called when "Apply" is clicked
 * @param {Function} onClear - Called when "Clear All" is clicked
 */
export default function FilterBottomSheet({
  isOpen,
  onClose,
  filters = {},
  onFiltersChange,
  onApply,
  onClear,
}) {
  const sheetRef = useRef(null);
  const backdropRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const diff = currentY.current - startY.current;
    
    if (diff > 100) {
      // Swiped down more than 100px - close
      onClose();
    }
    
    // Reset transform
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
  };

  // Update a single filter
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[85vh] overflow-hidden transition-transform duration-300 safe-area-bottom"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Search filters"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close filters"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[calc(85vh-140px)] px-4 py-4 space-y-5">
          {/* Gender */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Gender</label>
            <div className="flex flex-wrap gap-2">
              {["", "female", "male", "trans", "couple"].map((value) => (
                <button
                  key={value}
                  onClick={() => updateFilter("gender", value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    filters.gender === value
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {value === "" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Ethnicity */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Ethnicity</label>
            <select
              value={filters.ethnicity || ""}
              onChange={(e) => updateFilter("ethnicity", e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Any</option>
              {ETHNICITIES.map((eth) => (
                <option key={eth} value={eth}>{eth}</option>
              ))}
            </select>
          </div>

          {/* Body Type */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Body Type</label>
            <select
              value={filters.bodyType || ""}
              onChange={(e) => updateFilter("bodyType", e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Any</option>
              {BODY_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Distance - uses 'd' for VivaStreet consistency */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 flex justify-between">
              <span>Distance</span>
              <span className="text-slate-500">{filters.d || 10} miles</span>
            </label>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={filters.d || 10}
              onChange={(e) => updateFilter("d", Number(e.target.value))}
              className="w-full cursor-pointer accent-blue-500 h-2"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 mi</span>
              <span>50 mi</span>
            </div>
          </div>

          {/* Age Range */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 flex justify-between">
              <span>Age</span>
              <span className="text-slate-500">
                {filters.ageRange?.[0] || 21}–{filters.ageRange?.[1] || 35}
              </span>
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-8">Min</span>
                <input
                  type="range"
                  min={18}
                  max={55}
                  step={1}
                  value={filters.ageRange?.[0] || 21}
                  onChange={(e) => updateFilter("ageRange", [Number(e.target.value), filters.ageRange?.[1] || 35])}
                  className="flex-1 cursor-pointer accent-purple-500 h-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-8">Max</span>
                <input
                  type="range"
                  min={18}
                  max={55}
                  step={1}
                  value={filters.ageRange?.[1] || 35}
                  onChange={(e) => updateFilter("ageRange", [filters.ageRange?.[0] || 21, Number(e.target.value)])}
                  className="flex-1 cursor-pointer accent-blue-600 h-2"
                />
              </div>
            </div>
          </div>

          {/* Meeting Type */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Meeting Type</label>
            <div className="flex gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.incall || false}
                  onChange={(e) => updateFilter("incall", e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-300"
                />
                <span className="text-sm text-slate-700">Incall</span>
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.outcall || false}
                  onChange={(e) => updateFilter("outcall", e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-300"
                />
                <span className="text-sm text-slate-700">Outcall</span>
              </label>
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Services</label>
            <div className="flex flex-wrap gap-2">
              {['GFE', 'OWO', 'Massage', 'BDSM', 'Duo', 'A-Level', 'Domination'].map((service) => {
                const isSelected = filters.services?.includes(service);
                return (
                  <button
                    key={service}
                    onClick={() => {
                      const current = filters.services || [];
                      if (isSelected) {
                        updateFilter("services", current.filter(s => s !== service));
                      } else {
                        updateFilter("services", [...current, service]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {service}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-4 py-4 border-t border-slate-200 bg-white">
          <button
            onClick={onClear}
            className="flex-1 h-12 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex-1 h-12 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900 shadow-md hover:brightness-110 transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
