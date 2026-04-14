import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import api from '../api/client';
import { useToastContext } from '../context/ToastContextGlobal';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../config/api';
import Icons from '../components/ProfileIcons';
import { LoadingScreen, ErrorScreen, Lightbox } from '../components/ProfileSubComponents';
import PlatformDisclaimer from '../components/trust/PlatformDisclaimer';
import { isAgeVerified } from '../components/trust/AgeGateModal';
import { useWhatsAppSafety } from '../components/trust/WhatsAppSafetyModal';
import { useReportModal } from '../components/trust/ReportModal';
import './EscortProfilePage_Cinematic.css';

// ─── Helpers ─────────────────────────────────────────────
const getImageUrl = (path) => getAssetUrl(path);

/** Rate badge metadata keyed by pricing field name */
const PRICE_LABELS = {
  price_15min:    { label: '15 min',    icon: '⚡', tag: 'Quick' },
  price_30min:    { label: '30 min',    icon: '🔥', tag: 'Express' },
  price_1hour:    { label: '1 hour',    icon: '⭐', tag: 'Most Popular', featured: true },
  price_2hours:   { label: '2 hours',   icon: '💫', tag: 'Extended' },
  price_3hours:   { label: '3 hours',   icon: '👑', tag: 'VIP' },
  price_overnight:{ label: 'Overnight', icon: '🌙', tag: 'Premium' },
  // Non-escort pricing keys
  price_hourly:   { label: 'Per Hour',    icon: '⏱️', tag: '' },
  price_daily:    { label: 'Day Rate',    icon: '📅', tag: '' },
  price_fixed:    { label: 'Price',       icon: '💰', tag: '' },
  price_half_day: { label: 'Half Day',    icon: '🕐', tag: '' },
  price_full_day: { label: 'Full Day',    icon: '📆', tag: '' },
  price_package:  { label: 'Package',     icon: '📦', tag: '' },
  price_monthly:  { label: 'Monthly',     icon: '🏠', tag: '' },
  price_deposit:  { label: 'Deposit',     icon: '🔒', tag: '' },
  price_90min:    { label: '90 min',      icon: '⏰', tag: '' },
};

/** All active/published listings are "Available Now" */
const getOnlineStatus = () => ({ label: 'Available Now', color: 'emerald', online: true });

/** Hard-coded FAQ entries (could move to CMS later) */
const buildFaqItems = (profile) => [
  {
    q: "How do I book an appointment?",
    a: "Simply contact me via WhatsApp or phone call. I prefer a brief introduction message first, then we can discuss availability and arrangements."
  },
  {
    q: "What's your cancellation policy?",
    a: "I understand plans can change. Please notify me as soon as possible if you need to cancel or reschedule. Last-minute cancellations may affect future bookings."
  },
  {
    q: "Do you require a deposit?",
    a: "For longer bookings or outcalls, a small deposit may be required to secure our date. This is fully deducted from the final rate."
  },
  {
    q: "Are your photos authentic?",
    a: "Yes! All my photos are recent and unedited. What you see is exactly what you get. I believe in honest representation."
  },
  {
    q: "What areas do you cover for outcalls?",
    a: profile.profileFields?.outcall !== false
      ? `I'm available for outcalls within ${profile.profileFields?.travelRadius || profile.location || 'the local area'}. Travel fees may apply for locations further away.`
      : "I currently only offer incall services. Please contact me for my location details."
  },
  {
    q: "How should I prepare for our meeting?",
    a: "Just be yourself! I appreciate punctuality, good hygiene, and respectful communication. If you have any specific preferences, let me know in advance."
  }
];

// ─── Main Component ──────────────────────────────────────
const EscortProfilePage = () => {
  const { id } = useParams();
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { isLoggedIn } = useAuth();
  const heroRef = useRef(null);
  
  // Trust & Safety modals
  const { openSafetyModal, WhatsAppSafetyModal } = useWhatsAppSafety();
  const { openReportModal, ReportModal } = useReportModal({ showToast });
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gallery / lightbox state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState({});

  // User interaction state
  const [saved, setSaved] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Page-level derived state
  const [similarProfiles, setSimilarProfiles] = useState([]);
  const [heroInView, setHeroInView] = useState(true);
  const [viewCount] = useState(() => Math.floor(Math.random() * 500) + 150);

  // Typewriter animation state
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [titleReady, setTitleReady] = useState(false);

  // Cinema mode (auto-hide UI to focus on images)
  // eslint-disable-next-line no-unused-vars
  const [cinemaMode, setCinemaMode] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  // eslint-disable-next-line no-unused-vars
  const cinemaTimerRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const swipeHintTimerRef = useRef(null);

  // ─── Effects: Data Fetching ───

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get(`/ads/${id}`);
        const data = response.data;
        
        const gallery = [];
        if (data.images?.length > 0) {
          data.images.forEach((img) => gallery.push({ type: 'image', src: getImageUrl(img) }));
        }
        if (data.videos?.length > 0) {
          data.videos.forEach((vid) => gallery.push({ type: 'video', src: getImageUrl(vid.url || vid) }));
        }
        
        setProfile({ ...data, gallery });
        // Track profile view (fire-and-forget)
        api.post('/analytics/view', { adId: id }).catch(() => {});
        // Check saved status from backend
        if (isLoggedIn) {
          try {
            const savedRes = await api.get('/saved-profiles');
            const savedIds = (savedRes.data.savedProfiles || []).map(sp => sp.adId?._id || sp.adId);
            setSaved(savedIds.includes(id));
          } catch { /* ignore */ }
        }
      } catch (err) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch similar profiles
  useEffect(() => {
    if (!profile?._id) return;
    const fetchSimilar = async () => {
      try {
        // First try same location, then fallback to any approved ads
        const { data } = await api.get('/ads', { 
          params: { 
            limit: 8,
            status: 'approved'
          } 
        });
        // Filter out current profile and limit to 4
        const allAds = data.ads || data || [];
        const filtered = allAds.filter(ad => ad._id !== id && ad._id !== profile._id).slice(0, 4);
        setSimilarProfiles(filtered);
      } catch (err) {
        console.error('Failed to fetch similar profiles', err);
      }
    };
    fetchSimilar();
  }, [profile?._id, id]);

  // ─── Effects: UI Animations & Timers ───

  // Auto-slide for hero gallery (only when NOT in cinema mode - user is swiping)
  useEffect(() => {
    if (!profile?.gallery?.length || profile.gallery.length <= 1 || cinemaMode) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % profile.gallery.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [profile?.gallery?.length, cinemaMode]);

  // Cinema Mode: disabled auto-hide - content always visible
  // Cinema mode timer removed for usability

  // Cinema Mode: Touch/Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = () => {
    const diffX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;
    
    if (Math.abs(diffX) > minSwipeDistance) {
      // Swipe detected - change image
      if (diffX > 0) {
        // Swipe left - next image
        setCurrentSlide(prev => (prev + 1) % (profile?.gallery?.length || 1));
      } else {
        // Swipe right - previous image
        setCurrentSlide(prev => (prev - 1 + (profile?.gallery?.length || 1)) % (profile?.gallery?.length || 1));
      }
    }
    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };
  
  // Cinema Mode: Tap handler disabled - content always visible
  const handleHeroTap = () => {};

  // Typewriter animation - reveal title one character at a time
  useEffect(() => {
    if (!profile?.title) return;
    setDisplayedTitle('');
    setTitleReady(false);
    let i = 0;
    const chars = profile.title;
    const interval = setInterval(() => {
      i++;
      setDisplayedTitle(chars.slice(0, i));
      if (i >= chars.length) {
        clearInterval(interval);
        setTitleReady(true);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [profile?.title]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') setLightboxIndex(p => (p - 1 + (profile?.gallery?.length || 1)) % (profile?.gallery?.length || 1));
      if (e.key === 'ArrowRight') setLightboxIndex(p => (p + 1) % (profile?.gallery?.length || 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, profile?.gallery?.length]);

  // Track hero visibility for floating CTA
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      { threshold: 0.3 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // ─── Event Handlers ───

  const handleSave = useCallback(async () => {
    if (!isLoggedIn) {
      showToast('Please log in to save profiles');
      return;
    }
    try {
      if (saved) {
        await api.delete(`/saved-profiles/${id}`);
        setSaved(false);
        showToast('Removed from favorites');
      } else {
        await api.post('/saved-profiles', { adId: id });
        setSaved(true);
        showToast('💖 Saved to favorites!');
      }
    } catch {
      showToast('Failed to update saved profiles');
    }
  }, [saved, id, showToast, isLoggedIn]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('✨ Link copied!');
      }
    } catch (err) { /* Silently handle */ }
  };

  const handleReport = () => {
    openReportModal(id);
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (!profile) return <ErrorScreen error="Profile not found" />;

  // ─── Derived Values ───

  const onlineStatus = getOnlineStatus(profile);
  const allServices = profile.selectedServices || [];
  const faqItems = buildFaqItems(profile);
  const memberSince = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2025';

  // ─── Render ───

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#1a1520] to-[#faf8f9]">
      
      {/* Page-wide gradient overlay for smooth transition */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-rose-100/20" />
        <div className="absolute bottom-0 left-0 right-0 h-[60vh] bg-gradient-to-t from-[#fdf8f8] via-[#f8f0f5] to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/2 h-[40vh] bg-gradient-to-tr from-pink-200/30 via-purple-200/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-1/2 h-[40vh] bg-gradient-to-tl from-blue-200/30 via-rose-200/20 to-transparent blur-3xl" />
      </div>
      
      {/* ===== GLASS NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 navbar-glass">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white hover:text-rose-300 transition-colors group">
            <img src="/logomark.png" alt="ReachRipple" className="w-8 h-8 object-contain" /> 
            <span className="font-black"><span className="text-pink-400">Reach</span><span className="bg-gradient-to-r from-purple-400 to-blue-900 bg-clip-text text-transparent">Ripple</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 backdrop-blur-sm" title="Share">
              <Icons.Share className="w-5 h-5" />
            </button>
            <button onClick={handleSave} className={`p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 backdrop-blur-sm ${saved ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-rose-400'}`} title={saved ? 'Saved' : 'Save'}>
              <Icons.Heart filled={saved} className={`w-5 h-5 ${saved ? 'animate-heartPop' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* ===== IMMERSIVE HERO SECTION ===== */}
      <header 
        ref={heroRef} 
        className="relative min-h-[85vh] sm:min-h-[88vh] lg:min-h-[92vh] overflow-hidden bg-[#0a0a0f] cursor-pointer select-none"
        onClick={handleHeroTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Hero Background Image */}
        <div className="absolute inset-0">
          {profile.gallery?.map((item, idx) => (
            <div key={idx} className={`absolute inset-0 transition-all duration-1000 flex items-center justify-center bg-[#0a0a0f] ${idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
              {item.type === 'video' ? (
                <video className="w-full h-full object-cover object-center" muted autoPlay loop playsInline>
                  <source src={item.src} />
                </video>
              ) : (
                <img 
                  src={item.src} 
                  alt="" 
                  className={`w-full h-full object-contain object-center transition-all duration-700 ${imageLoaded[idx] ? 'blur-0' : 'blur-md'}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  onLoad={() => setImageLoaded(prev => ({ ...prev, [idx]: true }))}
                />
              )}
            </div>
          ))}
          {/* Cinematic overlays */}
          <div className={`absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-[#0a0a0f]/30 transition-opacity duration-500 ${cinemaMode ? 'opacity-30' : 'opacity-100'}`} />
          <div className={`absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/40 transition-opacity duration-500 ${cinemaMode ? 'opacity-20' : 'opacity-100'}`} />
          {/* Animated glow */}
          <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-rose-500/20 blur-3xl animate-pulse-slow transition-opacity duration-500 ${cinemaMode ? 'opacity-30' : 'opacity-100'}`} />
          
          {/* Image Counter (shows in cinema mode) */}
          {profile.gallery?.length > 1 && (
            <div className={`absolute top-24 right-4 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md text-white text-sm font-bold transition-all duration-500 ${cinemaMode ? 'opacity-100 translate-y-0' : 'opacity-60'}`}>
              {currentSlide + 1} / {profile.gallery.length}
            </div>
          )}
          
          {/* Swipe Hint (shows briefly when entering cinema mode) */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 text-white/70 text-sm font-medium transition-all duration-700 pointer-events-none ${showSwipeHint && cinemaMode ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <Icons.ChevronLeft className="w-6 h-6 animate-pulse" />
            <span className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm">Swipe to browse</span>
            <Icons.ChevronRight className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 pt-16 sm:pt-24 pb-4 sm:pb-8 min-h-[85vh] sm:min-h-[88vh] lg:min-h-[92vh] flex flex-col justify-end">
          
          {/* Top Badges - HIDE in cinema mode */}
          <div className={`absolute top-24 left-4 flex flex-wrap gap-2 transition-all duration-500 ${cinemaMode ? 'opacity-0 translate-y-[-20px] pointer-events-none' : 'opacity-100 translate-y-0 animate-fadeIn'}`}>
            {profile.tier === 'FEATURED' && (
              <span className="badge-vip">
                <span className="animate-pulse">✨</span> Featured
              </span>
            )}
            {profile.tier === 'PRIORITY_PLUS' && (
              <span className="badge-featured">🌟 Priority Plus</span>
            )}
            {profile.isVerified && (
              <span className="badge-verified">
                <Icons.Verified className="w-3.5 h-3.5" /> Verified
              </span>
            )}
            {/* Independent / Agency badge */}
            <span className={profile.profileFields?.type === 'Agency' ? 'badge-agency' : 'badge-independent'}>
              {profile.profileFields?.type === 'Agency' ? '🏢' : '👤'} {profile.profileFields?.type || 'Independent'}
            </span>
          </div>
          
          {/* Gallery Navigation */}
          {profile.gallery?.length > 1 && (
            <>
              <button 
                onClick={() => setCurrentSlide(p => (p - 1 + profile.gallery.length) % profile.gallery.length)} 
                className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 backdrop-blur-md text-white transition-all hover:bg-black/50 hover:scale-110 ${cinemaMode ? 'opacity-80' : 'opacity-0 hover:opacity-100 lg:opacity-60'}`}
              >
                <Icons.ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setCurrentSlide(p => (p + 1) % profile.gallery.length)} 
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 backdrop-blur-md text-white transition-all hover:bg-black/50 hover:scale-110 ${cinemaMode ? 'opacity-80' : 'opacity-0 hover:opacity-100 lg:opacity-60'}`}
              >
                <Icons.ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Main Hero Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 items-end">
            
            {/* Left: Title & Stats */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-6">
              
              {/* Title with typewriter-style reveal - HIDE in cinema mode */}
              <div className={`space-y-2 transition-all duration-500 ${cinemaMode ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'} ${titleReady && !cinemaMode ? 'animate-slideUp' : ''}`} style={{ opacity: displayedTitle && !cinemaMode ? 1 : 0, transition: 'opacity 0.5s ease, transform 0.5s ease' }}>
                <h1 className={`hero-title text-2xl sm:text-3xl lg:text-5xl font-black tracking-tight ${titleReady ? 'title-glow' : ''}`}>
                  <span className={`typewriter-text ${!titleReady ? 'typewriter-blur' : 'typewriter-clear'}`}>
                    {displayedTitle}
                    <span className={`typewriter-cursor ${titleReady ? 'opacity-0' : 'opacity-100'}`}>|</span>
                  </span>
                </h1>
                
                {/* Location & Age */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/80">
                  {profile.category && profile.category !== 'Escorts' && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-white/20 text-white rounded-full">
                      {profile.category}
                    </span>
                  )}
                  {profile.location && (
                    <span className="flex items-center gap-1.5 text-sm sm:text-base">
                      <Icons.MapPin className="w-4 h-4 text-rose-400" />
                      <span className="font-medium">{profile.location}</span>
                    </span>
                  )}
                  {profile.age && (
                    <span className="flex items-center gap-1.5 text-sm sm:text-base">
                      <span className="w-1 h-1 rounded-full bg-rose-400" />
                      <span className="font-medium">{profile.age} years</span>
                    </span>
                  )}
                </div>
              </div>
              
              {/* Stats Row - Social Proof - HIDE in cinema mode */}
              <div className={`flex flex-wrap gap-1.5 sm:gap-2 transition-all duration-500 ${cinemaMode ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0 animate-slideUp'}`} style={{ animationDelay: '0.1s' }}>
                {/* Views - Social Proof */}
                <div className="stat-chip">
                  <Icons.Eye className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
                  <span className="text-white/90 text-xs sm:text-sm">{viewCount} views</span>
                </div>
                
                {/* Quick Reply - hide on mobile */}
                <div className="stat-chip hidden sm:flex">
                  <Icons.Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-white/90">Quick reply</span>
                </div>
                
                {/* Independent / Agency */}
                <div className="stat-chip">
                  {profile.profileFields?.type === 'Agency'
                    ? <Icons.Building className="w-3 h-3 sm:w-4 sm:h-4 text-sky-400" />
                    : <Icons.Shield className="w-3 h-3 sm:w-4 sm:h-4 text-pink-400" />}
                  <span className="text-white/90 text-xs sm:text-sm">{profile.profileFields?.type || 'Independent'}</span>
                </div>

                {/* Member Since - hide on mobile */}
                <div className="stat-chip hidden sm:flex">
                  <Icons.Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-white/90">Member since {memberSince}</span>
                </div>
              </div>
              
              {/* Price Highlight - STAYS VISIBLE in cinema mode */}
              <div className={`animate-slideUp transition-all duration-500 ${cinemaMode ? 'translate-y-0' : ''}`} style={{ animationDelay: '0.2s' }}>
                <div className="inline-flex items-baseline gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl glass-card">
                  <span className="text-white/60 text-xs sm:text-sm font-medium">From</span>
                  <span className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-rose-300 via-purple-300 to-rose-300 bg-clip-text text-transparent">
                    £{profile.price || profile.pricing?.price_1hour || '—'}
                  </span>
                  <span className="text-white/50 text-xs sm:text-sm">/hour</span>
                </div>
              </div>
              
              {/* CTA Buttons (Hero) - STAYS VISIBLE in cinema mode */}
              <div className={`flex flex-wrap gap-2 sm:gap-3 animate-slideUp transition-all duration-500 ${cinemaMode ? 'translate-y-0' : ''}`} style={{ animationDelay: '0.3s' }}>
                {!showPhone ? (
                  <button 
                    onClick={() => setShowPhone(true)}
                    className="btn-primary flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-base"
                  >
                    <Icons.Phone className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> 
                    <span>Reveal Phone</span>
                  </button>
                ) : (
                  <a 
                    href={`tel:${profile.phone}`}
                    className="btn-primary flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-base animate-fadeIn"
                  >
                    <Icons.Phone className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    <span className="font-mono tracking-wide text-xs sm:text-base">{profile.phone || 'Not available'}</span>
                  </a>
                )}
                <button 
                  onClick={() => openSafetyModal(profile.phone, id, handleReport)}
                  className="btn-whatsapp flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-base cursor-pointer"
                >
                  <Icons.Message className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> 
                  <span>WhatsApp</span>
                </button>
                <button 
                  onClick={() => setLightboxOpen(true)}
                  className={`btn-ghost flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-4 text-xs sm:text-base transition-all duration-500 ${cinemaMode ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}
                >
                  📸 <span>View Gallery</span>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 text-2xs sm:text-xs font-bold">{profile.gallery?.length || 0}</span>
                </button>
              </div>
              
              {/* Tap hint - shown in cinema mode */}
              <div className={`mt-4 text-center transition-all duration-500 ${cinemaMode ? 'opacity-60' : 'opacity-0'}`}>
                <span className="text-white/50 text-xs">Tap anywhere to show details</span>
              </div>
            </div>

            {/* Right: Online Status Card - HIDE in cinema mode */}
            <div className={`hidden lg:block transition-all duration-500 ${cinemaMode ? 'opacity-0 translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0 animate-slideUp'}`} style={{ animationDelay: '0.2s' }}>
              <div className="glass-card p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-rose-500/50">
                      {profile.gallery?.[0] ? (
                        <img src={profile.gallery[0].src} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                          {profile.title?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0a0a0f] ${
                      onlineStatus.color === 'emerald' ? 'bg-emerald-500 animate-pulse'
                        : onlineStatus.color === 'yellow' ? 'bg-yellow-500'
                        : 'bg-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{profile.title}</p>
                    <p className={`text-sm font-medium flex items-center gap-1.5 ${
                      onlineStatus.color === 'emerald' ? 'text-emerald-400'
                        : onlineStatus.color === 'yellow' ? 'text-yellow-400'
                        : 'text-gray-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        onlineStatus.color === 'emerald' ? 'bg-emerald-500 animate-pulse'
                          : onlineStatus.color === 'yellow' ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      }`} />
                      {onlineStatus.label}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{profile.age || '—'}</p>
                    <p className="text-xs text-white/50">Age</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{viewCount}</p>
                    <p className="text-xs text-white/50">Views</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Gallery Dots */}
          {profile.gallery?.length > 1 && (
            <div className="flex justify-center gap-2 mt-8 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
              {profile.gallery.slice(0, 8).map((_, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setCurrentSlide(idx)} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-white w-8' : 'bg-white/30 w-1.5 hover:bg-white/50'}`}
                />
              ))}
              {profile.gallery.length > 8 && <span className="text-white/40 text-xs">+{profile.gallery.length - 8}</span>}
            </div>
          )}
        </div>
      </header>

      {/* ===== CINEMATIC GALLERY STRIP ===== */}
      <section className="relative z-10 py-0.5 sm:py-1.5 border-t border-white/5 bg-gradient-to-b from-[#0a0a0f] via-[#15121a] to-[#1a1520]">
        <div className="max-w-7xl mx-auto px-1.5 sm:px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xs font-semibold text-white/70 flex items-center gap-0.5">
              📸 Gallery
            </h2>
            <button onClick={() => setLightboxOpen(true)} className="text-2xs text-rose-400/70 hover:text-rose-300 font-medium transition-colors">
              View All ({profile.gallery?.length || 0})
            </button>
          </div>
          
          {/* Horizontal Scroll Gallery */}
          <div className="gallery-strip flex gap-0.5 overflow-x-auto -mx-1.5 sm:-mx-4 px-1.5 sm:px-4 snap-x snap-mandatory">
            {profile.gallery?.map((item, idx) => (
              <button 
                key={idx}
                onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                className="gallery-shot flex-shrink-0 relative group snap-start"
              >
                {item.type === 'video' ? (
                  <>
                    <video className="w-full h-full object-cover" muted>
                      <source src={item.src} />
                    </video>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icons.Play className="w-5 h-5 text-white ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-rose-500/80 text-white text-xs font-bold">Video</span>
                  </>
                ) : (
                  <>
                    <img src={item.src} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
                <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <main className="relative z-10 py-6 sm:py-12">
        {/* Gradient overlay for smooth transition from dark to light */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1520] via-[#f8f5f7] to-[#fdf9fa] -z-10" />
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
              
              {/* ABOUT ME & SERVICES (merged) */}
              <section className="content-card animate-fadeIn">
                <h2 className="section-title">
                  <span className="section-icon from-rose-500 to-pink-600">✨</span>
                  About Me
                </h2>
                
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base lg:text-lg" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(profile.description || 'Contact me to learn more about my services and personality! I look forward to meeting you.', { ALLOWED_TAGS: ['br', 'p', 'strong', 'em'] }) }} />
                </div>
                
                {/* Profile Stats List */}
                <div className="mt-5 divide-y divide-gray-100">
                  {[
                    { label: 'Age', value: profile.age || '—', icon: '📅' },
                    { label: 'Type', value: profile.profileFields?.type || 'Independent', icon: profile.profileFields?.type === 'Agency' ? '🏢' : '👤' },
                    { label: 'Height', value: profile.profileFields?.height || "5'7\"", icon: '📏' },
                    { label: 'Ethnicity', value: profile.profileFields?.ethnicity || profile.ethnicity || '—', icon: '🌍' },
                    { label: 'Languages', value: profile.profileFields?.languages?.join(', ') || 'English', icon: '💬' },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <span className="flex items-center gap-2.5 text-sm text-gray-500">
                        <span className="text-base">{stat.icon}</span>
                        {stat.label}
                      </span>
                      <span className="font-semibold text-gray-800 text-sm">{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Services */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    💫 Services
                    {allServices.length > 0 && <span className="ml-auto text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">{allServices.length}</span>}
                  </h3>
                  
                  {allServices.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {allServices.map((service, idx) => (
                        <span key={idx} className="service-chip">
                          <span className="service-chip-icon">
                            <Icons.Check className="w-3 h-3" />
                          </span>
                          {service}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Contact me to discuss services</p>
                  )}
                </div>
                
                {/* Incall / Outcall */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Icons.MapPin className="w-4 h-4 text-rose-500" />
                    Service Locations
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className={`location-card group ${profile.profileFields?.incall !== false ? 'location-card-available' : 'location-card-unavailable'}`}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className={`location-icon ${profile.profileFields?.incall !== false ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gray-300'}`}>
                          <Icons.Home className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </span>
                        <div>
                          <p className="font-bold text-gray-800 text-sm sm:text-base">Incall</p>
                          <p className="text-2xs sm:text-xs text-gray-500">
                            {profile.profileFields?.incall !== false ? 'I can host you' : 'Not available'}
                          </p>
                        </div>
                      </div>
                      {profile.profileFields?.incall !== false && (
                        <span className="absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-2xs sm:text-xs font-bold">
                          ✓ Available
                        </span>
                      )}
                    </div>
                    <div className={`location-card group ${profile.profileFields?.outcall !== false ? 'location-card-available' : 'location-card-unavailable'}`}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className={`location-icon ${profile.profileFields?.outcall !== false ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gray-300'}`}>
                          <Icons.Building className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </span>
                        <div>
                          <p className="font-bold text-gray-800 text-sm sm:text-base">Outcall</p>
                          <p className="text-2xs sm:text-xs text-gray-500">
                            {profile.profileFields?.outcall !== false ? 'I can travel to you' : 'Not available'}
                          </p>
                        </div>
                      </div>
                      {profile.profileFields?.outcall !== false && (
                        <span className="absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 text-2xs sm:text-xs font-bold">
                          ✓ Available
                        </span>
                      )}
                    </div>
                  </div>
                  {profile.profileFields?.outcall !== false && profile.profileFields?.travelRadius && (
                    <p className="mt-3 text-sm text-gray-600 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                      Travel radius: {profile.profileFields.travelRadius}
                    </p>
                  )}
                </div>
              </section>

              {/* CATEGORY-SPECIFIC DETAILS (non-escort categories) */}
              {profile.categoryFields && Object.keys(profile.categoryFields).length > 0 && (
                <section className="content-card animate-fadeIn" style={{ animationDelay: '0.15s' }}>
                  <h2 className="section-title">
                    <span className="section-icon from-blue-500 to-indigo-600">📋</span>
                    {profile.category || 'Listing'} Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(profile.categoryFields).map(([key, value]) => {
                      if (!value || key === 'location') return null;
                      const label = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (s) => s.toUpperCase())
                        .replace(/_/g, ' ');
                      return (
                        <div key={key} className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-1.5">
                              {value.map((v, i) => (
                                <span key={i} className="px-2 py-0.5 bg-white text-gray-700 text-sm rounded-lg border border-gray-200">
                                  {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm font-semibold text-gray-800">{String(value)}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* RATES SECTION */}
              <section className="content-card animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                <h2 className="section-title">
                  <span className="section-icon from-amber-500 to-orange-600">💎</span>
                  Rates & Packages
                </h2>
                
                {profile.pricing ? (
                  <div className="space-y-3">
                    {Object.entries(profile.pricing).map(([key, value]) => {
                      if (!value) return null;
                      const info = PRICE_LABELS[key] || { label: key, icon: '💰', tag: '' };
                      return (
                        <div key={key} className={`rate-list-item ${info.featured ? 'rate-list-item-featured' : ''}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{info.icon}</span>
                            <div className="flex-1">
                              <p className={`font-semibold ${info.featured ? 'text-rose-600' : 'text-gray-800'}`}>{info.label}</p>
                              {info.tag && <p className="text-xs text-gray-400">{info.tag}</p>}
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-black ${info.featured ? 'bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent' : 'text-gray-800'}`}>
                                £{typeof value === 'number' ? value.toLocaleString() : value}
                              </p>
                            </div>
                          </div>
                          {info.featured && (
                            <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-purple-500 text-white text-[9px] font-bold shadow-lg">
                              ⭐ Popular
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-2xl border border-dashed border-gray-300 bg-gray-50">
                    <span className="text-4xl mb-3 block">💳</span>
                    <p className="text-gray-600 font-medium">Contact me to discuss rates</p>
                    <p className="text-gray-400 text-sm mt-1">Flexible packages available</p>
                  </div>
                )}
              </section>

              {/* TRUST & SAFETY */}
              <section className="content-card animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                <h2 className="section-title">
                  <span className="section-icon from-emerald-500 to-teal-600">🛡️</span>
                  Trust & Safety
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: <Icons.Shield className="w-5 h-5" />, title: '100% Confidential', desc: 'Your privacy is my priority', color: 'text-emerald-400' },
                    { icon: <Icons.Verified className="w-5 h-5" />, title: 'Authentic Photos', desc: 'What you see is what you get', color: 'text-blue-400' },
                    { icon: <Icons.Check className="w-5 h-5" />, title: 'Respectful & Discreet', desc: 'Professional at all times', color: 'text-purple-400' },
                  ].map((item, i) => (
                    <div key={i} className="trust-card">
                      <span className={`mb-3 block ${item.color}`}>{item.icon}</span>
                      <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
              
              {/* FAQ ACCORDION */}
              <section className="content-card animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                <h2 className="section-title">
                  <span className="section-icon from-blue-500 to-cyan-600">❓</span>
                  Frequently Asked Questions
                </h2>
                
                <div className="space-y-2 sm:space-y-3">
                  {faqItems.map((faq, idx) => (
                    <div 
                      key={idx} 
                      className="faq-item"
                    >
                      <button 
                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                        className="faq-question w-full"
                      >
                        <span className="flex items-center gap-2 sm:gap-3">
                          <span className={`faq-number ${expandedFaq === idx ? 'faq-number-active' : ''}`}>
                            {idx + 1}
                          </span>
                          <span className="text-left font-semibold text-gray-800 text-sm sm:text-base">{faq.q}</span>
                        </span>
                        <Icons.ChevronDown className={`faq-chevron ${expandedFaq === idx ? 'faq-chevron-open' : ''}`} />
                      </button>
                      
                      <div className={`faq-answer ${expandedFaq === idx ? 'faq-answer-open' : ''}`}>
                        <div className="pl-8 sm:pl-11 pr-4 pb-4">
                          <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Still have questions? */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-purple-50 to-rose-50 border border-purple-100">
                  <p className="text-sm text-gray-700 flex items-center gap-2">
                    <Icons.HelpCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span><strong>Still have questions?</strong> Don't hesitate to reach out - I'm happy to chat!</span>
                  </p>
                </div>
              </section>
            </div>

            {/* Right Column - Sidebar (Hidden on mobile - uses floating CTA instead) */}
            <div className="hidden lg:block space-y-6">
              
              {/* Sticky Contact Card */}
              <div className="sidebar-card sticky top-24">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-rose-500/30">
                      {profile.gallery?.[0] ? (
                        <img src={profile.gallery[0].src} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                          {profile.title?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                      onlineStatus.color === 'emerald' ? 'bg-emerald-500 animate-pulse'
                        : onlineStatus.color === 'yellow' ? 'bg-yellow-500'
                        : 'bg-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{profile.title}</h3>
                    <p className={`text-sm font-medium flex items-center gap-1.5 ${
                      onlineStatus.color === 'emerald' ? 'text-emerald-600'
                        : onlineStatus.color === 'yellow' ? 'text-yellow-600'
                        : 'text-gray-500'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        onlineStatus.color === 'emerald' ? 'bg-emerald-500 animate-pulse'
                          : onlineStatus.color === 'yellow' ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      }`} />
                      {onlineStatus.label}
                    </p>
                    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      profile.profileFields?.type === 'Agency'
                        ? 'bg-sky-100 text-sky-700 border border-sky-200'
                        : 'bg-pink-100 text-pink-700 border border-pink-200'
                    }`}>
                      {profile.profileFields?.type === 'Agency' ? '🏢' : '👤'} {profile.profileFields?.type || 'Independent'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button onClick={() => openSafetyModal(profile.phone, id, handleReport)} className="btn-whatsapp w-full flex items-center justify-center gap-2 py-4 text-base cursor-pointer">
                    <Icons.Message className="w-5 h-5" /> Message on WhatsApp
                  </button>
                  <a href={`tel:${profile.phone}`} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
                    <Icons.Phone className="w-5 h-5" /> Call Now
                  </a>
                  {/* SMS Message Button */}
                  {profile.phone && (
                    <a
                      href={`sms:${profile.phone}?body=${encodeURIComponent(`Hi! I saw your profile on ReachRipple and I'm interested.`)}`}
                      className="w-full flex items-center justify-center gap-2 py-4 text-base rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:brightness-110 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Send SMS
                    </a>
                  )}
                </div>


                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 gap-3 text-center">
                    <div>
                      <p className="text-xl font-black text-gray-800">{viewCount}</p>
                      <p className="text-xs text-gray-500">Views</p>
                    </div>
                  </div>
                  {/* Agency "See all ads" link */}
                  {profile.profileFields?.type === 'Agency' && profile.userId && (
                    <Link 
                      to={`/publisher/${profile.userId}`}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-50 text-sky-700 text-sm font-semibold hover:bg-sky-100 border border-sky-200 transition-colors"
                    >
                      🏢 See all listings from this agency
                    </Link>
                  )}
                </div>
              </div>
              
              {/* Report Card */}
              <div className="sidebar-card">
                <button onClick={handleReport} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 hover:border-red-500/50 transition-all">
                  <Icons.Flag className="w-4 h-4" /> Report Profile
                </button>
              </div>
              
              {/* Platform Disclaimer */}
              <PlatformDisclaimer />
            </div>
          </div>
        </div>
      </main>

      {/* ===== SIMILAR PROFILES SECTION ===== */}
      {similarProfiles.length > 0 && (
        <section className="relative z-10 py-2 sm:py-10 bg-gradient-to-b from-transparent via-[#fdf8f8] to-[#faf5f7]">
          <div className="max-w-7xl mx-auto px-1 sm:px-4">
            <div className="text-center mb-1.5 sm:mb-8">
              <h2 className="text-xs sm:text-2xl font-black text-gray-800 mb-0 sm:mb-2">
                You Might Also Like
              </h2>
              <p className="text-2xs sm:text-sm text-gray-500 hidden sm:block">Discover more profiles in {profile.location}</p>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-4 gap-1 sm:gap-4 md:gap-6">
              {similarProfiles.map((similar, idx) => (
                <Link 
                  key={similar._id} 
                  to={`/profile/${similar._id}`}
                  className="group relative overflow-hidden rounded-md sm:rounded-2xl bg-white shadow-sm sm:shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="aspect-[3/4] overflow-hidden">
                    <img 
                      src={similar.images?.[0] ? getImageUrl(similar.images[0]) : similar.gallery?.[0]?.src || '/placeholder-profile.jpg'}
                      alt={similar.title}
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </div>
                  
                  {/* Badges */}
                  <div className="absolute top-0.5 sm:top-3 left-0.5 sm:left-3 flex flex-wrap gap-0.5 sm:gap-1.5">
                    {similar.tier === 'FEATURED' && (
                      <span className="px-0.5 sm:px-2 py-0 sm:py-1 rounded-full text-2xs sm:text-[10px] font-bold bg-amber-500/90 text-white backdrop-blur-sm">Featured</span>
                    )}
                    {similar.isVerified && (
                      <span className="px-0.5 sm:px-2 py-0 sm:py-1 rounded-full text-2xs sm:text-[10px] font-bold bg-emerald-500/90 text-white backdrop-blur-sm">✓</span>
                    )}
                  </div>
                  
                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-1 sm:p-4">
                    <h3 className="font-bold text-white text-2xs sm:text-lg truncate mb-0 sm:mb-1">
                      {similar.title}
                    </h3>
                    <div className="hidden sm:flex items-center gap-2 text-white/80 text-sm">
                      <Icons.MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{similar.location}</span>
                      {similar.age && (
                        <span className="text-white/60">• {similar.age}</span>
                      )}
                    </div>
                    {(similar.price || similar.pricing?.price_1hour) && (
                      <p className="mt-0 sm:mt-2 text-rose-300 font-bold text-2xs sm:text-base">
                        £{similar.price || similar.pricing?.price_1hour}
                      </p>
                    )}
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-rose-600/40 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              ))}
            </div>
            
            {/* View More Link */}
            <div className="text-center mt-2 sm:mt-8">
              <Link 
                to={`/escort/${profile.location?.toLowerCase().replace(/\s+/g, '-') || 'gb'}`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-rose-500/25 transition-all hover:-translate-y-0.5"
              >
                View All in {profile.location}
                <Icons.ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 py-8 pb-28 bg-gradient-to-b from-[#faf5f7] to-[#f5f0f2]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex items-center gap-2">
              <img src="/logomark.png" alt="ReachRipple" className="w-8 h-8 object-contain" />
              <span className="font-bold"><span className="text-pink-500">Reach</span><span className="bg-gradient-to-r from-purple-500 to-blue-900 bg-clip-text text-transparent">Ripple</span></span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <Link to="/help" className="hover:text-rose-500 transition-colors">Help</Link>
              <Link to="/privacy" className="hover:text-rose-500 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-rose-500 transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-rose-500 transition-colors">Contact</Link>
            </div>
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </footer>

      {/* ===== FLOATING BOTTOM CTA (Shows when hero scrolled out of view) ===== */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${heroInView ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <div className="p-3 sm:p-4 glass-card-dark border-t border-white/10 safe-area-bottom">
          <div className="max-w-lg mx-auto flex gap-2 sm:gap-3">
            <a href={`tel:${profile.phone}`} className="flex-1 btn-primary flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 text-sm sm:text-base">
              <Icons.Phone className="w-4 h-4 sm:w-5 sm:h-5" /> Call
            </a>
            <button onClick={() => openSafetyModal(profile.phone, id, handleReport)} className="flex-1 btn-whatsapp flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 text-sm sm:text-base cursor-pointer">
              <Icons.Message className="w-4 h-4 sm:w-5 sm:h-5" /> WhatsApp
            </button>
            <button onClick={handleSave} className={`btn-ghost px-4 sm:px-5 py-3 sm:py-4 ${saved ? 'text-rose-400 bg-rose-500/20' : ''}`}>
              <Icons.Heart filled={saved} className={`w-5 h-5 sm:w-6 sm:h-6 ${saved ? 'animate-heartPop' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== LIGHTBOX ===== */}
      {lightboxOpen && (
        <Lightbox
          gallery={profile.gallery}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onChangeIndex={setLightboxIndex}
        />
      )}

      {/* Trust & Safety Modals */}
      <WhatsAppSafetyModal />
      <ReportModal />
    </div>
  );
};

// Wrapper with age gate guard (avoids hooks-before-return violation)
function EscortProfilePageGuarded() {
  if (!isAgeVerified()) return null;
  return <EscortProfilePage />;
}

export default EscortProfilePageGuarded;
