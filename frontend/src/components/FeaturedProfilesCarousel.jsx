import React, { useState, useEffect, useCallback } from 'react'; // Verified build
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAssetUrl } from '../config/api';

const getImageUrl = (path) => getAssetUrl(path) || '/placeholder.jpg';

/**
 * FeaturedProfilesCarousel - Swipeable carousel showing top profiles
 * Features:
 * - Auto-play with configurable interval
 * - Smooth transitions
 * - Touch/keyboard navigation
 * - Profile overlay with key info
 * - Trust badges (verified, rating, online status)
 */
export default function FeaturedProfilesCarousel({ profiles = [], autoPlayInterval = 5000 }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlaying || !profiles || profiles.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % profiles.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, profiles, autoPlayInterval]);

  const goToSlide = useCallback((index) => {
    if (!profiles || profiles.length === 0) return;
    setCurrentIndex(index % profiles.length);
    setIsAutoPlaying(false);
  }, [profiles]);

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    if (!profiles || profiles.length === 0) return;
    goToSlide(currentIndex - 1 + profiles.length);
  }, [currentIndex, goToSlide, profiles]);

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    
    const distance = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(distance) > 50) {
      if (distance > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nextSlide, prevSlide]);

  if (!profiles || profiles.length === 0) {
    return null;
  }

  const profile = profiles[currentIndex];
  const mainImage = getImageUrl(profile.images?.[0]);

  return (
    <div className="w-full h-[65vh] min-h-[450px] max-h-[650px] bg-gray-900 relative overflow-hidden rounded-2xl group shadow-2xl">
      {/* Carousel container */}
      <div
        className="relative w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/10 z-20">
            <div 
                key={currentIndex}
                className="h-full bg-gradient-to-r from-brand-500 to-purple-600 origin-left"
                style={{
                    width: '100%',
                    animation: isAutoPlaying ? `progress ${autoPlayInterval}ms linear forwards` : 'none',
                    transform: isAutoPlaying ? 'none' : 'scaleX(0)' // Reset or hold? usually reset on hover or pause
                }}
            />
            {/* Inject keyframes for this specific animation if not in global css */}
            <style>{`
                @keyframes progress {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
            `}</style>
        </div>

        {/* Image with animated overlay */}
        <img
          src={mainImage}
          alt={profile.title || 'Featured profile'}
          className="w-full h-full object-cover animate-fade-in"
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-70" />

        {/* Profile info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white animate-fade-in-up">
          <div className="max-w-md">
            {/* Title and basic info */}
            <div className="mb-4">
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                {profile.title || 'Featured Profile'}
              </h2>
              <p className="text-lg opacity-90">
                {profile.age && `${profile.age} years old`}
                {profile.location && ` • ${profile.location}`}
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {profile.isOnline && (
                <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-400 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Online now
                </div>
              )}
              
              {profile.isVerified && (
                <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400 text-sm flex items-center gap-1">
                  ✓ Verified
                </div>
              )}

              {profile.reviews && (
                <div className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-400 text-sm flex items-center gap-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  {(profile.reviews / 10).toFixed(1)} stars
                </div>
              )}

              {(new Date().getTime() - new Date(profile.createdAt).getTime()) < 48 * 60 * 60 * 1000 && (
                <div className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400 text-sm">
                  ✨ New
                </div>
              )}
            </div>

            {/* Description */}
            {profile.description && (
              <p className="text-sm opacity-80 mb-6 line-clamp-2">
                {profile.description}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/profile/${profile._id}`)}
                className="
                  px-6 py-2 rounded-lg 
                  bg-gradient-to-r from-pink-500 to-purple-600 
                  text-white font-semibold 
                  shadow-lg shadow-pink-500/20
                  hover:shadow-pink-500/40 hover:scale-105 
                  transition-all duration-300 active:scale-95
                "
              >
                View Profile
              </button>
              <button
                onClick={() => navigate(`/profile/${profile._id}`)}
                className="
                  px-6 py-2 rounded-lg 
                  bg-white/10 backdrop-blur-md border border-white/30 
                  text-white font-semibold 
                  hover:bg-white/20 hover:border-white/50
                  transition-all duration-300
                "
              >
                💬 Message
              </button>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <button
          onClick={prevSlide}
          className="
            absolute left-4 top-1/2 -translate-y-1/2 z-20 
            p-3 rounded-full 
            bg-white/10 backdrop-blur-md border border-white/20
            text-white 
            hover:bg-white/30 hover:scale-110
            transition-all duration-300
            opacity-0 group-hover:opacity-100
          "
          aria-label="Previous profile"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>

        <button
          onClick={nextSlide}
          className="
            absolute right-4 top-1/2 -translate-y-1/2 z-20 
            p-3 rounded-full 
            bg-white/10 backdrop-blur-md border border-white/20
            text-white 
            hover:bg-white/30 hover:scale-110
            transition-all duration-300
            opacity-0 group-hover:opacity-100
          "
          aria-label="Next profile"
        >
          <ChevronRight size={24} strokeWidth={2.5} />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {profiles.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Slide counter */}
        <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-black/50 text-white text-sm font-medium">
          {currentIndex + 1} / {profiles.length}
        </div>
      </div>
    </div>
  );
}
