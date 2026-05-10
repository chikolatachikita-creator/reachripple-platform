import React from "react";
import { X } from "lucide-react";

/**
 * ActiveFilterChips - VivaStreet-style removable filter chips
 * 
 * Shows active filters as removable chips for quick control.
 * Each chip shows the filter value and an X to remove it.
 * 
 * UX Benefits:
 * - Users see exactly what filters are active
 * - Quick removal without opening filter panels
 * - Builds trust and control
 */
export default function ActiveFilterChips({
  filters,
  locationLabel,
  onRemoveFilter,
  onClearAll,
}) {
  const chips = [];

  // Location chip
  if (locationLabel && filters.location && filters.location !== "gb") {
    chips.push({
      key: "location",
      label: locationLabel,
      icon: "📍",
      color: "bg-blue-100 text-blue-700 border-blue-200",
    });
  }

  // Distance chip
  if (filters.d > 0) {
    chips.push({
      key: "d",
      label: `${filters.d} miles`,
      icon: "🎯",
      color: "bg-blue-100 text-blue-700 border-blue-200",
    });
  }

  // Verified chip
  if (filters.verifiedOnly) {
    chips.push({
      key: "verifiedOnly",
      label: "Verified",
      icon: "✓",
      color: "bg-green-100 text-green-700 border-green-200",
    });
  }

  // Available Today chip
  if (filters.availableToday) {
    chips.push({
      key: "availableToday",
      label: "Available Today",
      icon: "⚡",
      color: "bg-amber-100 text-amber-700 border-amber-200",
    });
  }

  // Independent chip
  if (filters.independentOnly) {
    chips.push({
      key: "independentOnly",
      label: "Independent",
      icon: "👤",
      color: "bg-purple-100 text-purple-700 border-purple-200",
    });
  }

  // Keyword chip
  if (filters.keyword) {
    chips.push({
      key: "keyword",
      label: `"${filters.keyword}"`,
      icon: "🔍",
      color: "bg-zinc-100 text-zinc-700 border-zinc-200",
    });
  }

  // Age range chip (only if not default)
  if (filters.ageRange[0] !== 18 || filters.ageRange[1] !== 60) {
    chips.push({
      key: "ageRange",
      label: `${filters.ageRange[0]}-${filters.ageRange[1]} years`,
      icon: "📅",
      color: "bg-zinc-100 text-zinc-700 border-zinc-200",
    });
  }

  // Price range chip (only if not default)
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) {
    chips.push({
      key: "priceRange",
      label: `£${filters.priceRange[0]}-${filters.priceRange[1]}`,
      icon: "💷",
      color: "bg-zinc-100 text-zinc-700 border-zinc-200",
    });
  }

  // Ethnicity chip
  if (filters.ethnicity) {
    chips.push({
      key: "ethnicity",
      label: filters.ethnicity,
      icon: "🌍",
      color: "bg-zinc-100 text-zinc-700 border-zinc-200",
    });
  }

  // Body type chip
  if (filters.bodyType) {
    chips.push({
      key: "bodyType",
      label: filters.bodyType,
      icon: "✨",
      color: "bg-zinc-100 text-zinc-700 border-zinc-200",
    });
  }

  // Gender chip
  if (filters.gender) {
    chips.push({
      key: "gender",
      label: filters.gender,
      icon: "⚧",
      color: "bg-zinc-100 text-zinc-700 border-zinc-200",
    });
  }

  // Services chips (each service as separate chip)
  if (filters.services?.length > 0) {
    filters.services.forEach((service) => {
      chips.push({
        key: "services",
        value: service,
        label: service,
        icon: "💫",
        color: "bg-indigo-100 text-indigo-700 border-indigo-200",
      });
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Individual filter chips */}
      {chips.map((chip, index) => (
        <button
          key={`${chip.key}-${chip.value || index}`}
          onClick={() => onRemoveFilter(chip.key, chip.value)}
          className={`
            group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
            text-xs font-medium border transition-all
            hover:shadow-sm active:scale-95
            ${chip.color}
          `}
          title={`Remove: ${chip.label}`}
        >
          <span className="text-sm">{chip.icon}</span>
          <span className="max-w-[120px] truncate">{chip.label}</span>
          <X
            className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity"
            strokeWidth={2.5}
          />
        </button>
      ))}

      {/* Clear all button (only show if 2+ chips) */}
      {chips.length >= 2 && (
        <button
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                     text-xs font-medium text-zinc-500 hover:text-zinc-700
                     hover:bg-zinc-100 transition-all active:scale-95"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} />
          Clear all
        </button>
      )}
    </div>
  );
}
