import React from "react";

/**
 * SortDropdown — sort control for search results.
 * Props: value, onChange, compact
 */
const SortDropdown = ({ value, onChange, compact = false }) => {
  const options = [
    { value: "recommended", label: "Recommended" },
    { value: "newest", label: "Newest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "distance", label: "Distance" },
  ];

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">Sort by</span>
      )}
      <select
        value={value || "recommended"}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-blue-400 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortDropdown;
