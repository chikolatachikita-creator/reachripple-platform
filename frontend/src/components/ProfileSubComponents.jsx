import React from 'react';
import { Link } from 'react-router-dom';
import Icons from './ProfileIcons';

/* ───────────────────────────────────────────────
   Loading screen shown while profile data fetches
   ─────────────────────────────────────────────── */
export const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-600/30">
        <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
      <p className="text-white/60 font-medium">Loading profile...</p>
    </div>
  </div>
);

/* ───────────────────────────────────────────────
   Error / not-found screen
   ─────────────────────────────────────────────── */
export const ErrorScreen = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-6">
    <div className="text-center max-w-md bg-[#12121a] rounded-3xl p-8 border border-white/5">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
        <span className="text-4xl">😢</span>
      </div>
      <h1 className="text-2xl font-black text-white mb-3">Oops!</h1>
      <p className="text-white/50 mb-6">{error}</p>
      <div className="flex gap-3 justify-center">
        <Link to="/escort/gb" className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-blue-600/25 transition-all">
          Browse Profiles
        </Link>
        <Link to="/" className="px-6 py-3.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all">
          Home
        </Link>
      </div>
    </div>
  </div>
);

/* ───────────────────────────────────────────────
   Lightbox overlay for full-screen gallery
   ─────────────────────────────────────────────── */
export const Lightbox = ({ gallery, currentIndex, onClose, onChangeIndex }) => {
  const currentMedia = gallery?.[currentIndex];
  if (!currentMedia) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/98 flex items-center justify-center animate-fadeIn" onClick={onClose}>
      <button className="absolute top-6 right-6 p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110 active:scale-95" aria-label="Close lightbox">
        <Icons.X className="w-6 h-6" />
      </button>

      <span className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white font-bold">
        {currentIndex + 1} <span className="text-white/50 font-normal">of</span> {gallery.length}
      </span>

      <div className="max-w-5xl max-h-[85vh] px-4" onClick={e => e.stopPropagation()}>
        {currentMedia.type === 'video' ? (
          <video className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" controls autoPlay><source src={currentMedia.src} /></video>
        ) : (
          <img src={currentMedia.src} alt="" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
        )}
      </div>

      {gallery.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); onChangeIndex((currentIndex - 1 + gallery.length) % gallery.length); }}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110 active:scale-95 group"
            aria-label="Previous image"
          >
            <Icons.ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onChangeIndex((currentIndex + 1) % gallery.length); }}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110 active:scale-95 group"
            aria-label="Next image"
          >
            <Icons.ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </>
      )}

      {/* Bottom thumbnails */}
      {gallery.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-3 rounded-2xl bg-black/50 backdrop-blur-md overflow-x-auto max-w-[90vw] scrollbar-thin">
          {gallery.map((item, idx) => (
            <button
              key={idx}
              onClick={e => { e.stopPropagation(); onChangeIndex(idx); }}
              className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 ${idx === currentIndex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-90 hover:scale-105'}`}
            >
              {item.type === 'video' ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Icons.Play className="w-4 h-4 text-white" /></div>
              ) : (
                <img src={item.src} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
