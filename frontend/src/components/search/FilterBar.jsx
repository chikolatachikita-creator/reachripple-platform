import React from "react";

/**
 * FilterBar — mobile-only horizontal filter controls.
 * Props: filters, onFilterChange, onOpenMore, activeCount, locationLabel
 */
const FilterBar = ({ filters, onFilterChange, onOpenMore, activeCount, locationLabel }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-zinc-200 overflow-x-auto scrollbar-none">
      {/* Filter toggle */}
      <button
        onClick={onOpenMore}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full border border-zinc-300 hover:border-blue-400 hover:bg-blue-50 transition-all shrink-0"
      >
        <span>⚡</span>
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="ml-1 min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold bg-blue-500 text-white rounded-full px-1.5">
            {activeCount}
          </span>
        )}
      </button>

      {/* Location pill */}
      {locationLabel && (
        <span className="px-3 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-600 rounded-full shrink-0">
          📍 {locationLabel}
        </span>
      )}

      {/* Quick filter chips */}
      {["Verified", "With Photos", "Available Now"].map((label) => {
        const key = label === "Verified" ? "verified" : label === "With Photos" ? "hasPhotos" : "available";
        const active = !!filters[key];
        return (
          <button
            key={label}
            onClick={() => onFilterChange({ ...filters, [key]: !active })}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border shrink-0 transition-all ${
              active
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-zinc-600 border-zinc-300 hover:border-blue-400"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default FilterBar;
