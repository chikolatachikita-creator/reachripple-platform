import React, { memo } from "react";

/**
 * SkeletonCard - Animated loading placeholder for search results
 * 
 * Features:
 * - Matches SearchResultCard structure exactly
 * - Pulse animation (not shimmer overload)
 * - Image aspect ratio locked to prevent layout shift
 */

interface SkeletonCardProps {
  /** Card layout variant */
  variant?: "normal" | "compact";
}

function SkeletonCard({ variant = "normal" }: SkeletonCardProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={`
        rounded-2xl bg-white overflow-hidden
        border border-zinc-100
        shadow-[0_2px_12px_rgba(0,0,0,0.04)]
      `}
    >
      {/* Image Block - 60% of card */}
      <div
        className={`
          relative bg-gradient-to-br from-zinc-100 to-zinc-50
          ${isCompact ? "aspect-[4/3]" : "aspect-[3/4]"}
        `}
      >
        {/* Subtle pulse overlay */}
        <div className="absolute inset-0 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
        
        {/* Top right badges placeholder */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          <div className="w-8 h-8 rounded-full bg-zinc-200/60 animate-pulse" />
          <div className="w-14 h-5 rounded-full bg-zinc-200/60 animate-pulse" style={{ animationDelay: "50ms" }} />
        </div>
        
        {/* Bottom left verified badge placeholder */}
        <div className="absolute bottom-3 left-3">
          <div className="w-20 h-6 rounded-full bg-white/60 backdrop-blur-sm animate-pulse" />
        </div>
      </div>

      {/* Content Block */}
      <div className="p-4 space-y-3">
        {/* Identity strip */}
        <div className="space-y-2">
          {/* Name */}
          <div
            className="h-5 bg-gradient-to-r from-zinc-200 to-zinc-100 rounded-lg w-3/4 animate-pulse"
            style={{ animationDelay: "100ms" }}
          />
          {/* Age • Gender • Ethnicity */}
          <div
            className="h-3.5 bg-zinc-100 rounded-lg w-2/3 animate-pulse"
            style={{ animationDelay: "150ms" }}
          />
          {/* Location */}
          <div
            className="h-3 bg-zinc-100 rounded-lg w-1/2 animate-pulse"
            style={{ animationDelay: "200ms" }}
          />
        </div>

        {/* Trust chips */}
        <div className="flex gap-2 pt-1">
          <div
            className="h-6 bg-zinc-50 rounded-full w-24 animate-pulse"
            style={{ animationDelay: "250ms" }}
          />
          <div
            className="h-6 bg-zinc-50 rounded-full w-20 animate-pulse"
            style={{ animationDelay: "300ms" }}
          />
        </div>

        {/* Services */}
        <div className="flex gap-1.5 pt-1">
          <div
            className="h-6 bg-emerald-50 rounded-full w-16 animate-pulse"
            style={{ animationDelay: "350ms" }}
          />
          <div
            className="h-6 bg-emerald-50 rounded-full w-20 animate-pulse"
            style={{ animationDelay: "400ms" }}
          />
          <div
            className="h-6 bg-zinc-100 rounded-full w-14 animate-pulse"
            style={{ animationDelay: "450ms" }}
          />
        </div>

        {/* Rate + CTA row */}
        <div className="flex items-center justify-between pt-2">
          <div
            className="h-6 bg-zinc-200 rounded-lg w-20 animate-pulse"
            style={{ animationDelay: "500ms" }}
          />
          <div
            className="h-10 bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl w-28 animate-pulse"
            style={{ animationDelay: "550ms" }}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(SkeletonCard);
