import React from 'react';

export default function SkeletonLoader({ width = 'w-full', height = 'h-8', rounded = 'rounded-lg' }) {
  return (
    <div className={`${width} ${height} ${rounded} bg-gray-200 dark:bg-gray-700 animate-pulse`} />
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm animate-pulse border border-gray-100 dark:border-gray-700">
      {/* Image placeholder - Match new card aspect ratio */}
      <div className="w-full aspect-[4/5] bg-gray-200 dark:bg-gray-700 relative">
        {/* Badge placeholder */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
             <SkeletonLoader width="w-1/2" height="h-6" rounded="rounded-lg" />
             <SkeletonLoader width="w-1/4" height="h-6" rounded="rounded-lg" />
        </div>
        <SkeletonLoader width="w-3/4" height="h-4" />
        
        {/* Location & Chips */}
        <div className="flex gap-2 pt-2">
          <SkeletonLoader width="w-16" height="h-6" rounded="rounded-full" />
          <SkeletonLoader width="w-16" height="h-6" rounded="rounded-full" />
          <SkeletonLoader width="w-16" height="h-6" rounded="rounded-full" />
        </div>

        {/* Button placeholder */}
        <div className="pt-2">
            <SkeletonLoader width="w-full" height="h-10" rounded="rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function GallerySkeletons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="w-full h-96 bg-gray-300 dark:bg-gray-700 rounded-xl animate-pulse" />
      
      {/* Content sections */}
      <div className="space-y-4">
        <SkeletonLoader width="w-2/3" height="h-8" />
        <SkeletonLoader width="w-full" height="h-4" />
        <SkeletonLoader width="w-full" height="h-4" />
        <SkeletonLoader width="w-4/5" height="h-4" />
      </div>
    </div>
  );
}
