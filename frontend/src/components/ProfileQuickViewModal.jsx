import React, { useState } from 'react';
import { X, Star, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAssetUrl } from '../config/api';

const getImageUrl = (path) => getAssetUrl(path) || '/placeholder.jpg';

/**
 * ProfileQuickViewModal - Instant preview of profile without navigation
 * Shows:
 * - Top 3 photos in carousel
 * - Name, age, rating, verification
 * - Top services offered
 * - Pricing info
 * - CTA buttons (Message, View Full)
 */
export default function ProfileQuickViewModal({ profile, isOpen, onClose }) {
  const navigate = useNavigate();
  const [imageIndex, setImageIndex] = useState(0);

  if (!isOpen || !profile) return null;

  const images = profile.images?.slice(0, 3).map(img => getImageUrl(img)) || [];
  const currentImage = images[imageIndex] || '/placeholder.jpg';
  const rating = profile.reviews ? (profile.reviews / 10).toFixed(1) : null;

  const handleNavigate = () => {
    onClose();
    navigate(`/profile/${profile._id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full mx-auto overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row h-[85vh] md:h-auto max-h-[650px]">
          {/* Left Column: Image Carousel */}
          <div className="relative w-full md:w-1/2 h-1/2 md:h-auto bg-gray-900">
            <img
              src={currentImage}
              alt={`${profile.title} - ${imageIndex + 1}`}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:hidden" />

            {/* Back Button (Mobile Only) */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 text-white backdrop-blur-md md:hidden"
            >
              <X size={20} />
            </button>

            {/* Verification Badge Over Image */}
            {profile.isVerified && (
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold">
                 <span>✓</span> Verified Profile
              </div>
            )}

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all"
                >
                  <span className="text-xl">‹</span>
                </button>
                <button
                  onClick={() => setImageIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all"
                >
                  <span className="text-xl">›</span>
                </button>
                
                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                    {images.map((_, idx) => (
                    <div 
                        key={idx}
                        onClick={() => setImageIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${idx === imageIndex ? 'bg-white scale-125' : 'bg-white/50'}`} 
                    />
                    ))}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Details */}
          <div className="w-full md:w-1/2 flex flex-col h-1/2 md:h-auto md:max-h-[650px]">
             {/* Desktop Close Button */}
             <div className="hidden md:flex justify-end p-4 pb-0">
               <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                 <X size={24} />
               </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
              {/* Header Info */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                   {profile.isOnline && (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse relative">
                        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></span>
                      </span>
                   )}
                   <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                      {profile.isOnline ? 'Online Now' : 'Featured Profile'}
                   </span>
                </div>
                
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
                  {profile.title}
                </h2>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{profile.age} years</span>
                    {profile.location && (
                        <span className="flex items-center gap-1">
                            <MapPin size={14} className="text-gray-400" />
                            {profile.location}
                        </span>
                    )}
                    {rating && (
                        <span className="flex items-center gap-1 text-amber-500 font-medium">
                            <Star size={14} fill="currentColor" />
                            {rating} ({profile.reviews || 0})
                        </span>
                    )}
                </div>
              </div>

              {/* Bio Snippet */}
              {profile.description && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
                     {profile.description}
                   </p>
                </div>
              )}

              {/* Services Grid */}
              {profile.selectedServices && profile.selectedServices.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Services</h4>
                    <div className="flex flex-wrap gap-2">
                        {profile.selectedServices.slice(0, 6).map((service, idx) => (
                            <span key={idx} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                                {service}
                            </span>
                        ))}
                         {profile.selectedServices.length > 6 && (
                            <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold">
                                +{profile.selectedServices.length - 6} more
                            </span>
                        )}
                    </div>
                </div>
              )}

              {/* Pricing */}
              {profile.price && (
                <div className="mb-8">
                   <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">My Rate</h4>
                   <div className="text-2xl font-bold text-gray-900">
                     £{profile.price} <span className="text-base font-normal text-gray-500">/ hour</span>
                   </div>
                </div>
              )}
            </div>

            {/* Footer / CTA Actions */}
            <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50/50">
               <div className="flex gap-3">
                  <button
                    onClick={() => {
                        alert('Messaging is currently disabled in preview mode.');
                    }}
                    className="
                      flex-1 py-3.5 px-6 rounded-xl 
                      border-2 border-blue-200 bg-white
                      text-blue-600 font-bold 
                      hover:bg-blue-50 hover:border-blue-300 hover:-translate-y-0.5
                      transition-all duration-200
                      flex items-center justify-center gap-2
                    "
                  >
                    <span>💬</span> Send Message
                  </button>
                  <button
                    onClick={handleNavigate}
                    className="
                      flex-[2] py-3.5 px-6 rounded-xl 
                      bg-gradient-to-r from-blue-600 to-purple-600 
                      text-white font-bold 
                      shadow-lg shadow-blue-600/20 
                      hover:shadow-blue-600/40 hover:scale-[1.02] hover:-translate-y-0.5
                      active:scale-[0.98] 
                      transition-all duration-200
                      flex items-center justify-center gap-2
                    "
                  >
                    <span>✨</span> View Full Profile
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
