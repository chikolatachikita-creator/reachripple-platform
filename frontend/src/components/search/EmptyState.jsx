import React from "react";

/**
 * EmptyState — shown when search has no results or an error.
 * Props: type ("error" | "no-results"), location, onClearFilters, suggestedLocations
 */
const EmptyState = ({ type = "no-results", location, onClearFilters, suggestedLocations }) => {
  if (type === "error") {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Something went wrong</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          We couldn't load results. Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 text-sm font-semibold bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="text-5xl mb-4">🔍</div>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No results found</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        {location
          ? `We couldn't find any profiles near ${location}. Try expanding your search area or adjusting filters.`
          : "Try adjusting your filters or search criteria."}
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-6 py-2.5 text-sm font-semibold bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Suggested locations */}
      {suggestedLocations && suggestedLocations.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">Try searching in:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestedLocations.map((loc) => {
              const label = typeof loc === 'string' ? loc : loc.name;
              const key = typeof loc === 'string' ? loc : loc.slug || loc.name;
              return (
                <span
                  key={key}
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full"
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
