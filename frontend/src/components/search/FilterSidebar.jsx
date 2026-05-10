import React from "react";

/**
 * FilterSidebar — desktop sidebar with all filter options.
 * Props: filters, onFilterChange, onClear, loading
 */
const FilterSidebar = ({ filters, onFilterChange, onClear, loading }) => {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-zinc-700 mb-2">Category</label>
        <select
          value={filters.category || ""}
          onChange={(e) => handleChange("category", e.target.value || undefined)}
          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
          <option value="">All Categories</option>
          <option value="escorts">Escorts</option>
          <option value="adult-entertainment">Adult Entertainment</option>
          <option value="personals">Personals</option>
        </select>
      </div>

      {/* Age range */}
      <div>
        <label className="block text-sm font-semibold text-zinc-700 mb-2">Age Range</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.ageMin || ""}
            onChange={(e) => handleChange("ageMin", e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min={18}
            max={99}
            disabled={loading}
          />
          <span className="text-zinc-400">—</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.ageMax || ""}
            onChange={(e) => handleChange("ageMax", e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min={18}
            max={99}
            disabled={loading}
          />
        </div>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-sm font-semibold text-zinc-700 mb-2">Price Range (£)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceMin || ""}
            onChange={(e) => handleChange("priceMin", e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min={0}
            disabled={loading}
          />
          <span className="text-zinc-400">—</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.priceMax || ""}
            onChange={(e) => handleChange("priceMax", e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min={0}
            disabled={loading}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-zinc-700 mb-1">More Filters</label>
        {[
          { key: "verified", label: "Verified Only" },
          { key: "hasPhotos", label: "With Photos" },
          { key: "available", label: "Available Now" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={!!filters[key]}
              onChange={(e) => handleChange(key, e.target.checked || undefined)}
              className="w-4 h-4 text-blue-500 border-zinc-300 rounded focus:ring-blue-500"
              disabled={loading}
            />
            <span className="text-sm text-zinc-600 group-hover:text-zinc-900">{label}</span>
          </label>
        ))}
      </div>

      {/* Clear all */}
      <button
        onClick={onClear}
        className="w-full px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
        disabled={loading}
      >
        Clear All Filters
      </button>
    </div>
  );
};

export default FilterSidebar;
