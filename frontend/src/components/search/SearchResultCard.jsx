import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * SearchResultCard — compact card for search results grid.
 * Props: profile, index, onQuickView
 */
const SearchResultCard = ({ profile, index, onQuickView }) => {
  const navigate = useNavigate();

  const mainImage =
    profile.images && profile.images.length > 0
      ? profile.images[0].startsWith("http")
        ? profile.images[0]
        : `/uploads/${profile.images[0]}`
      : "/placeholder.jpg";

  const handleClick = () => {
    navigate(`/profile/${profile._id}`);
  };

  return (
    <div
      className="group relative bg-white rounded-xl overflow-hidden border border-zinc-200/60 hover:border-pink-300 hover:shadow-lg transition-all cursor-pointer"
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
        <img
          src={mainImage}
          alt={profile.title || profile.name || "Profile"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading={index < 6 ? "eager" : "lazy"}
        />

        {/* Tier badge */}
        {profile.tier && profile.tier !== "STANDARD" && (
          <div className="absolute top-2 left-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                profile.tier === "FEATURED"
                  ? "bg-amber-400 text-amber-900"
                  : profile.tier === "PRIORITY_PLUS"
                  ? "bg-purple-500 text-white"
                  : "bg-pink-500 text-white"
              }`}
            >
              {profile.tier === "FEATURED"
                ? "Featured"
                : profile.tier === "PRIORITY_PLUS"
                ? "Priority Plus"
                : "Priority"}
            </span>
          </div>
        )}

        {/* Quick view button */}
        {onQuickView && (
          <button
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm text-zinc-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow-md hover:bg-white transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(profile._id);
            }}
          >
            Quick View
          </button>
        )}

        {/* Image count */}
        {profile.images && profile.images.length > 1 && (
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
            📷 {profile.images.length}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-sm text-zinc-900 truncate flex-1">
            {profile.title || profile.name || "No Title"}
          </h3>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" title="Available now" />
        </div>
        <div className="flex items-center gap-1 mt-1">
          {/* Independent / Agency label */}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            profile.profileFields?.type === 'Agency'
              ? 'bg-sky-50 text-sky-600'
              : 'bg-pink-50 text-pink-600'
          }`}>
            {profile.profileFields?.type === 'Agency' ? '🏢 Agency' : '👤 Independent'}
          </span>
          {profile.age && (
            <>
              <span className="text-zinc-300">·</span>
              <span className="text-xs text-zinc-500">{profile.age}y</span>
            </>
          )}
          {profile.outcode && (
            <>
              <span className="text-zinc-300">·</span>
              <span className="text-xs text-zinc-500">{profile.outcode}</span>
            </>
          )}
        </div>
        {profile.price && (
          <p className="text-sm font-bold text-pink-600 mt-1">
            £{profile.price}
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchResultCard;
