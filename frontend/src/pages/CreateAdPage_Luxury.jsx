// src/pages/CreateAdPage_Luxury.jsx - Luxury Ad Creation with EscortProfilePage styling
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, ArrowRight, Check, X, Camera, Video, AlertCircle
} from "lucide-react";
import api from "../api/client";
import { sanitizeText, sanitizeHtml } from "../utils/security";
import { useToastContext } from "../context/ToastContextGlobal";
import ThemeToggle from "../components/ThemeToggle";

function CreateAdPageLuxury() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [error] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // ===== FORM STATE ====="
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    title: "",
    description: "",
    category: "Escorts",
    
    // Step 2: Profile Details
    location: "",
    age: "",
    gender: "Female",
    ethnicity: "",
    bodyType: "",
    languages: [],
    serviceFor: [],
    incall: true,
    outcall: true,
    travelRadius: "",
    
    // Step 3: Services & Pricing
    services: [],
    pricing: {
      price_15min: "",
      price_30min: "",
      price_1hour: "",
      price_2hours: "",
      price_3hours: "",
      price_overnight: "",
    },
    
    // Step 4: Media
    phone: "",
    email: "",
    whatsapp: "",
  });

  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // ===== FEATURE SELECTION =====
  const [enabledFeatures, setEnabledFeatures] = useState({
    profileFields: false,
    pricing: false,
    services: false,
    languages: false,
    serviceFor: false,
    contact: false,
    locationServices: false,
  });

  const FEATURE_DEFINITIONS = {
    profileFields: {
      label: "Enhanced Profile",
      description: "Add detailed profile info (age, gender, ethnicity, body type)",
      icon: "👤"
    },
    locationServices: {
      label: "Incall / Outcall",
      description: "Specify if you offer incall, outcall, or both",
      icon: "🏠"
    },
    pricing: {
      label: "Multi-Tier Pricing",
      description: "Set prices for different service durations (15min - Overnight)",
      icon: "💰"
    },
    services: {
      label: "Services List",
      description: "Select specific services you offer",
      icon: "✨"
    },
    languages: {
      label: "Languages",
      description: "Specify languages you speak",
      icon: "🗣️"
    },
    serviceFor: {
      label: "Service For",
      description: "Indicate who you serve (Men, Women, Couples, etc.)",
      icon: "👥"
    },
    contact: {
      label: "Contact Methods",
      description: "Add phone, email, WhatsApp contact options",
      icon: "📱"
    },
  };

  // ===== OPTIONS =====
  const GENDERS = ["Female", "Male", "Trans", "Non-binary"];
  const ETHNICITIES = ["White", "Black", "Asian", "Latin", "Middle Eastern", "Mixed", "Other"];
  const BODY_TYPES = ["Petite", "Slim", "Athletic", "Curvy", "Plus Size", "Other"];
  const LANGUAGES_LIST = ["English", "Spanish", "French", "Italian", "German", "Portuguese", "Russian", "Chinese", "Arabic"];
  
  const SERVICES_LIST = [
    "Dinner Companion", "Travel", "Events", "Photography", "GFE",
    "Massage", "Tantric", "Role Play", "BDSM", "Couples", "Webcam"
  ];
  
  const SERVICE_FOR = ["Men", "Women", "Couples", "Groups", "Trans"];
  
  const PRICING_OPTIONS = [
    { key: "price_15min", label: "Quick Fix (15 min)" },
    { key: "price_30min", label: "Heat Check (30 min)" },
    { key: "price_1hour", label: "Prime Hour (1 hour)" },
    { key: "price_2hours", label: "Two-Hour Flow (2 hours)" },
    { key: "price_3hours", label: "Gold Session (3 hours)" },
    { key: "price_overnight", label: "VIP Lock-In (Overnight)" },
  ];

  // ===== MOBILE KEYBOARD FIX =====
  // Auto-scroll focused inputs into view and add bottom padding for mobile keyboard
  useEffect(() => {
    const handleFocus = (e) => {
      // Mobile keyboard detection and scroll delay
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Wait for keyboard animation
      }
    };

    // Get all input and textarea elements
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', handleFocus, { passive: true });
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', handleFocus);
      });
    };
  }, [currentStep]);

  // ===== VALIDATION =====
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!formData.title) errors.title = "Headline is required";
      if (!formData.description) errors.description = "About You section is required";
      if (!formData.category) errors.category = "Category is required";
    }
    if (step === 2) {
      if (!formData.location) errors.location = "Location is required";
      if (!formData.age) errors.age = "Age is required";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== HANDLERS =====
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleFeature = (feature) => {
    setEnabledFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleCheckboxArray = (field, value) => {
    setFormData(prev => {
      const arr = prev[field] || [];
      if (arr.includes(value)) {
        return {
          ...prev,
          [field]: arr.filter(v => v !== value)
        };
      } else {
        return {
          ...prev,
          [field]: [...arr, value]
        };
      }
    });
  };

  const handlePricingChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [key]: value
      }
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const MAX_IMAGES = 12;
    const MAX_SIZE = 5 * 1024 * 1024;

    files.forEach(file => {
      if (file.size > MAX_SIZE) {
        showToast(`Image too large: ${file.name} (max 5MB)`, "error");
        return;
      }

      if (images.length >= MAX_IMAGES) {
        showToast(`Maximum ${MAX_IMAGES} images allowed`, "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        setImages(prev => [...prev, {
          file,
          preview: evt.target.result
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast("Video too large (max 50MB)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setVideos(prev => [...prev, {
        file,
        preview: evt.target.result
      }]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveVideo = (index) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  // ===== SUBMIT =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentStep < 4) {
      // Validate current step before moving forward
      if (!validateStep(currentStep)) {
        showToast("Please fill in all required fields", "error");
        return;
      }
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
      return;
    }

    // Validate
    if (images.length < 1) {
      showToast("Please upload at least 1 image", "error");
      return;
    }

    if (!formData.title || !formData.description) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    if (!agreeToTerms) {
      showToast("Please agree to terms and conditions", "error");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        navigate("/login");
        return;
      }

      // Build FormData with files
      const formDataObj = new FormData();
      formDataObj.append("title", sanitizeText(formData.title));
      formDataObj.append("description", sanitizeHtml(formData.description));
      formDataObj.append("category", formData.category);
      formDataObj.append("location", sanitizeText(formData.location));
      formDataObj.append("age", formData.age);
      formDataObj.append("gender", formData.gender);
      formDataObj.append("ethnicity", formData.ethnicity);
      formDataObj.append("bodyType", formData.bodyType);
      formDataObj.append("phone", formData.phone);
      formDataObj.append("email", formData.email);
      formDataObj.append("whatsapp", formData.whatsapp);
      formDataObj.append("languages", JSON.stringify(formData.languages));
      formDataObj.append("services", JSON.stringify(formData.services));
      formDataObj.append("serviceFor", JSON.stringify(formData.serviceFor));
      formDataObj.append("pricing", JSON.stringify(formData.pricing));
      
      // Add profileFields with incall/outcall info
      const profileFields = {
        location: formData.location,
        gender: formData.gender,
        age: parseInt(formData.age) || undefined,
        ethnicity: formData.ethnicity,
        languages: formData.languages,
        serviceFor: formData.serviceFor,
        incall: formData.incall,
        outcall: formData.outcall,
        travelRadius: formData.travelRadius || undefined,
      };
      formDataObj.append("profileFields", JSON.stringify(profileFields));
      
      // Derive price from pricing.price_1hour or use default
      const basePrice = parseFloat(formData.pricing?.price_1hour) || 
                       parseFloat(formData.pricing?.price_30min) || 
                       parseFloat(formData.pricing?.price_15min) || 100;
      formDataObj.append("price", basePrice.toString());

      // Add images
      images.forEach((img, idx) => {
        formDataObj.append("images", img.file);
      });

      // Add videos
      videos.forEach((vid) => {
        formDataObj.append("videos", vid.file);
      });

      await api.post("/ads", formDataObj, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      showToast("Profile created successfully! 🎉");
      setTimeout(() => {
        navigate("/my-ads?created=1");
      }, 1500);
    } catch (err) {
      console.error("Submit error:", err);
      showToast(err.response?.data?.error || err.response?.data?.message || "Failed to create profile", "error");
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <Helmet><title>Create Ad | ReachRipple</title></Helmet>
      {/* Header with Glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/40 border-b border-pink-500/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Create Your Profile</h1>
              <p className="text-sm text-pink-300">Step {currentStep === 0 ? "Selection" : currentStep} of 4</p>
            </div>
          </div>
          {previewMode && (
            <button
              onClick={() => setPreviewMode(false)}
              className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-lg transition-colors"
            >
              ✕ Exit Preview
            </button>
          )}
          <ThemeToggle />
        </div>

        {/* Progress Bar */}
        <div className="max-w-5xl mx-auto px-4 pb-4">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
              style={{ width: `${((currentStep === 0 ? 0 : currentStep) / 4) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 pb-safe">
        {/* Mobile keyboard safe area padding */}
        <style>{`
          @supports (padding: max(0px)) {
            @media (max-height: 600px) and (orientation: landscape) {
              .pb-safe {
                padding-bottom: max(2rem, env(safe-area-inset-bottom));
              }
            }
            @media (max-height: 812px) and (orientation: portrait) {
              .pb-safe {
                padding-bottom: max(2rem, env(safe-area-inset-bottom));
              }
            }
          }
        `}</style>
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3 backdrop-blur">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ===== STEP 0: FEATURE SELECTION ===== */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8">
                <h2 className="text-2xl font-bold text-white mb-2">Choose Your Profile Features</h2>
                <p className="text-white/60 mb-8">Select which advanced features from EscortProfilePage you'd like to include in your profile:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {Object.entries(FEATURE_DEFINITIONS).map(([key, def]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleFeature(key)}
                      className={`p-5 rounded-xl border-2 transition-all text-left ${
                        enabledFeatures[key]
                          ? 'border-pink-500 bg-pink-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl">{def.icon}</span>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          enabledFeatures[key]
                            ? 'border-pink-500 bg-pink-500'
                            : 'border-white/30'
                        }`}>
                          {enabledFeatures[key] && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                      <h3 className="font-semibold text-white mb-1">{def.label}</h3>
                      <p className="text-sm text-white/60">{def.description}</p>
                    </button>
                  ))}
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8">
                  <p className="text-sm text-blue-200">
                    💡 <strong>Tip:</strong> You can always enable or disable features later. Choose what feels right for your profile!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 1: TITLE & DESCRIPTION ===== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Your Profile Title</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Headline <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="e.g., Victoria Grace - Luxury Companion"
                      maxLength={100}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:focus:ring-2 focus:ring-pink-500/20 outline-none transition-all ${
                        validationErrors.title
                          ? "border-red-500 focus:border-red-500"
                          : "border-white/20 focus:border-pink-500"
                      }`}
                    />
                    {validationErrors.title && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        ⚠️ {validationErrors.title}
                      </p>
                    )}
                    <p className="text-xs text-white/50 mt-1">{formData.title.length}/100</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      About You <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Tell clients about yourself, your personality, and what makes you special..."
                      maxLength={1000}
                      rows={6}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all resize-none ${
                        validationErrors.description
                          ? "border-red-500 focus:border-red-500"
                          : "border-white/20 focus:border-pink-500"
                      }`}
                    />
                    {validationErrors.description && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        ⚠️ {validationErrors.description}
                      </p>
                    )}
                    <p className="text-xs text-white/50 mt-1">{formData.description.length}/1000</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange("category", e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-pink-500 outline-none transition-all"
                    >
                      <option value="Escorts">Escorts</option>
                      <option value="Massage & Wellness">Massage & Wellness</option>
                      <option value="Dating & Personals">Dating & Personals</option>
                      <option value="Jobs & Services">Jobs & Services</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Alternative Lifestyle">Alternative Lifestyle</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 2: PROFILE DETAILS ===== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              {!enabledFeatures.profileFields && !enabledFeatures.languages && !enabledFeatures.serviceFor ? (
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Profile Details</h2>
                  <p className="text-white/60 mb-4">You didn't enable any profile detail features.</p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-lg transition-colors"
                  >
                    ← Go Back to Feature Selection
                  </button>
                </div>
              ) : (
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Profile Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Location <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="e.g., London, Manchester"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-pink-500 outline-none transition-all"
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Age <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={formData.age}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-pink-500 outline-none transition-all"
                    />
                  </div>

                  {enabledFeatures.profileFields && (
                    <>
                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Gender</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => handleInputChange("gender", e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none transition-all"
                        >
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>

                      {/* Ethnicity */}
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Ethnicity</label>
                        <select
                          value={formData.ethnicity}
                          onChange={(e) => handleInputChange("ethnicity", e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none transition-all"
                        >
                          <option value="">Select...</option>
                          {ETHNICITIES.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>

                      {/* Body Type */}
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Body Type</label>
                        <select
                          value={formData.bodyType}
                          onChange={(e) => handleInputChange("bodyType", e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none transition-all"
                        >
                          <option value="">Select...</option>
                          {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Languages */}
                {enabledFeatures.languages && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-white/80 mb-3">Languages</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {LANGUAGES_LIST.map(lang => (
                        <label key={lang} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.languages.includes(lang)}
                            onChange={() => handleCheckboxArray("languages", lang)}
                            className="w-4 h-4 accent-pink-500"
                          />
                          <span className="text-white/70">{lang}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service For */}
                {enabledFeatures.serviceFor && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-white/80 mb-3">I Provide Services For</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {SERVICE_FOR.map(sf => (
                        <label key={sf} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.serviceFor.includes(sf)}
                            onChange={() => handleCheckboxArray("serviceFor", sf)}
                            className="w-4 h-4 accent-pink-500"
                          />
                          <span className="text-white/70">{sf}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Incall / Outcall */}
                {enabledFeatures.locationServices && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-white/80 mb-3">Service Location</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Incall Toggle */}
                      <div 
                        onClick={() => handleInputChange("incall", !formData.incall)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          formData.incall 
                            ? 'bg-emerald-500/20 border-emerald-500/50 ring-2 ring-emerald-500/30' 
                            : 'bg-white/5 border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            formData.incall ? 'bg-emerald-500' : 'bg-white/20'
                          }`}>
                            🏠
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-white">Incall</p>
                            <p className="text-sm text-white/60">I can host at my place</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            formData.incall ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'
                          }`}>
                            {formData.incall && <span className="text-white text-sm">✓</span>}
                          </div>
                        </div>
                      </div>

                      {/* Outcall Toggle */}
                      <div 
                        onClick={() => handleInputChange("outcall", !formData.outcall)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          formData.outcall 
                            ? 'bg-purple-500/20 border-purple-500/50 ring-2 ring-purple-500/30' 
                            : 'bg-white/5 border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            formData.outcall ? 'bg-purple-500' : 'bg-white/20'
                          }`}>
                            🚗
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-white">Outcall</p>
                            <p className="text-sm text-white/60">I can travel to you</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            formData.outcall ? 'bg-purple-500 border-purple-500' : 'border-white/30'
                          }`}>
                            {formData.outcall && <span className="text-white text-sm">✓</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Travel Radius (only if outcall enabled) */}
                    {formData.outcall && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-white/80 mb-2">Travel Radius</label>
                        <input
                          type="text"
                          placeholder="e.g., 10 miles, Central London, etc."
                          value={formData.travelRadius}
                          onChange={(e) => handleInputChange("travelRadius", e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-purple-500 outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {/* ===== STEP 3: SERVICES & PRICING ===== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Services & Pricing</h2>
                
                {/* Services - always visible */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-white/80 mb-3">What Services Do You Offer?</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SERVICES_LIST.map(service => (
                      <label key={service} className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.services.includes(service)}
                          onChange={() => handleCheckboxArray("services", service)}
                          className="w-4 h-4 accent-pink-500"
                        />
                        <span className="text-white/70">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Pricing Tiers */}
                {enabledFeatures.pricing && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-4">Pricing Tiers (GBP)</label>
                  <div className="space-y-3">
                    {PRICING_OPTIONS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-4">
                        <label className="text-white/70 text-sm w-40">{label}</label>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-white/50">£</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.pricing[key]}
                            onChange={(e) => handlePricingChange(key, e.target.value)}
                            placeholder="0"
                            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-pink-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* Contact Methods */}
                {enabledFeatures.contact && (
                <div className="mt-8 pt-8 border-t border-white/10">
                  <label className="block text-sm font-medium text-white/80 mb-4">Contact Methods</label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-white/60 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="+44 7700 123456"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="contact@example.com"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1">WhatsApp</label>
                      <input
                        type="tel"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                        placeholder="+44 7700 123456"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          )}

          {/* ===== STEP 4: MEDIA & CONTACT ===== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              {/* Photos */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Photos & Videos</h2>
                
                {/* Photo Gallery */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/80 mb-4">
                    Upload Photos (minimum 1)
                  </label>
                  
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={img.preview} 
                            alt={`Upload ${idx + 1}`}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center justify-center w-full p-4 sm:p-6 md:p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-pink-500/50 transition-colors cursor-pointer">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                      <p className="text-white/70">Drag photos here or click to browse</p>
                      <p className="text-xs text-white/50 mt-1">Max 5MB per image, up to 12 total</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Video Upload */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-4">
                    Upload Video (optional)
                  </label>

                  {videos.length > 0 && (
                    <div className="mb-4 relative">
                      <video 
                        src={videos[0].preview}
                        controls
                        className="w-full max-h-80 rounded-lg bg-black"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(0)}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}

                  <label className="flex items-center justify-center w-full p-4 sm:p-6 md:p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-pink-500/50 transition-colors cursor-pointer">
                    <div className="text-center">
                      <Video className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                      <p className="text-white/70">Drag video here or click to browse</p>
                      <p className="text-xs text-white/50 mt-1">Max 50MB</p>
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+44 7700 900000"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-pink-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                      placeholder="+44 7700 900000"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-pink-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-pink-500 outline-none transition-all"
                    />
                  </div>
                </div>

              </div>

              {/* Terms */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="w-5 h-5 accent-pink-500 mt-1"
                  />
                  <span className="text-white/70">
                    I agree to the terms and conditions. I understand my listing will be reviewed before appearing.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 sticky bottom-0 py-4 bg-gradient-to-t from-slate-950 to-transparent pt-6">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-white/60 text-sm">
              Step {currentStep === 0 ? "Selection" : `${currentStep} of 4`}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              {currentStep === 4 ? (
                <>
                  <Check className="w-4 h-4" />
                  {loading ? "Creating..." : "Create Profile"}
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default CreateAdPageLuxury;
