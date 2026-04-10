import React from "react";

/**
 * LoadMoreButton — pagination / infinite scroll trigger.
 * Props: loading, hasMore, total, loaded, onLoadMore
 */
const LoadMoreButton = ({ loading, hasMore, total, loaded, onLoadMore }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-zinc-500">Loading more...</span>
      </div>
    );
  }

  if (!hasMore) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-zinc-400">
          Showing all {total} {total === 1 ? "result" : "results"}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <button
        onClick={onLoadMore}
        className="px-8 py-3 text-sm font-semibold bg-white text-pink-600 border-2 border-pink-200 rounded-xl hover:bg-pink-50 hover:border-pink-400 transition-all"
      >
        Load More ({loaded} of {total})
      </button>
    </div>
  );
};

export default LoadMoreButton;
