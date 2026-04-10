import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_HOST } from '../config/api';

// Helper to build full image URL (handles relative paths from backend)
const getImageUrl = (path) => {
  if (!path) return '/placeholder.jpg';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return `${API_HOST}${path}`;
};

/**
 * Image Lightbox Gallery
 * Mobile-first design with swipe support, large images, and easy navigation
 */
export default function ImageGallery({ images = [], title = '', isAdult = false }) {
  const { isLoggedIn } = useAuth();
  const shouldBlur = !isLoggedIn && isAdult;
  const blurClass = shouldBlur ? 'blur-xl scale-110' : '';

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  // Touch/swipe handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Navigation functions - must be defined before early return
  const goToPrevious = useCallback((e) => {
    if (e) e.stopPropagation();
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback((e) => {
    if (e) e.stopPropagation();
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Handle touch events for swipe
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // minimum swipe distance
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  }, [goToNext, goToPrevious]);

  // Empty state
  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-[4/3] sm:aspect-[16/10] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
        <span className="text-slate-500 dark:text-slate-400">No images available</span>
      </div>
    );
  }

  const currentImage = images[selectedIndex];
  const rawUrl = typeof currentImage === 'string' ? currentImage : currentImage?.url;
  const imageUrl = getImageUrl(rawUrl);

  const goToSlide = (index, e) => {
    if (e) e.stopPropagation();
    setSelectedIndex(index);
  };

  return (
    <>
      {/* Main Gallery Container */}
      <div className="space-y-3">
        {/* Main Image - Large and touchable */}
        <div 
          className="relative aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 group cursor-pointer"
          onClick={() => setIsOpen(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={imageUrl}
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${blurClass}`}
            loading="eager"
            fetchPriority="high"
          />
          
          {/* Adult Overlay */}
          {shouldBlur && (
             <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 pointer-events-none">
                 <div className="bg-black/60 backdrop-blur-md text-white/90 text-sm font-bold px-4 py-2 rounded-full border border-white/20 shadow-xl">
                    18+ Login to View
                 </div>
             </div>
          )}
          
          {/* Gradient overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Tap to zoom hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-14 h-14 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </div>
          </div>

          {/* Mobile swipe hint (shows briefly) */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:hidden bg-black/50 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse">
              <span>←</span> Swipe <span>→</span>
            </div>
          )}

          {/* Counter badge */}
          {images.length > 1 && (
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-sm font-semibold px-3 py-1.5 rounded-full">
              {selectedIndex + 1} / {images.length}
            </div>
          )}

          {/* Navigation arrows (desktop) */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goToPrevious(e); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Previous image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(e); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Dot indicators (mobile-friendly) */}
          {images.length > 1 && images.length <= 10 && (
            <div className="absolute bottom-3 right-3 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); goToSlide(idx, e); }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === selectedIndex
                      ? 'bg-white scale-125'
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnails row - larger and easier to tap */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 px-1 snap-x snap-mandatory hide-scrollbar">
            {images.map((img, idx) => {
              const url = getImageUrl(typeof img === 'string' ? img : img?.url);
              return (
                <button
                  key={idx}
                  onClick={(e) => goToSlide(idx, e)}
                  className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-3 transition-all snap-start ${
                    idx === selectedIndex
                      ? 'border-pink-500 ring-2 ring-pink-500/50 shadow-lg scale-105'
                      : 'border-slate-300 dark:border-slate-600 opacity-70 hover:opacity-100 hover:border-pink-300'
                  }`}
                >
                  <img 
                    src={url} 
                    alt={`Thumbnail ${idx + 1}`} 
                    className={`w-full h-full object-cover ${blurClass}`}
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setIsOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <span className="text-white font-medium">
              {selectedIndex + 1} of {images.length}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-300 transition-colors p-2"
              aria-label="Close"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main image area */}
          <div 
            className="flex-1 flex items-center justify-center p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt={title}
              className={`max-w-full max-h-full object-contain rounded-lg ${blurClass}`}
            />

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors"
                  aria-label="Previous image"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors"
                  aria-label="Next image"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Bottom thumbnails in lightbox */}
          {images.length > 1 && (
            <div className="p-4 bg-black/50 backdrop-blur-sm">
              <div className="flex gap-2 justify-center overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar">
                {images.map((img, idx) => {
                  const url = getImageUrl(typeof img === 'string' ? img : img?.url);
                  return (
                    <button
                      key={idx}
                      onClick={(e) => goToSlide(idx, e)}
                      className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all snap-start ${
                        idx === selectedIndex
                          ? 'border-pink-500 ring-2 ring-pink-500/50'
                          : 'border-white/30 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Thumbnail ${idx + 1}`} className={`w-full h-full object-cover ${blurClass}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
