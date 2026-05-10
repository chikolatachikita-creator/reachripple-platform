// src/pages/EditAdPage_Luxury.jsx - Luxury Ad Editing with EscortProfilePage styling
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, Check, X, Camera, Video, Trash2,
  AlertCircle, Edit2, Eye, Save, Settings, Heart, CheckCircle2, Phone, Home
} from "lucide-react";
import api from "../api/client";
import { sanitizeText, sanitizeHtml } from "../utils/security";
import { getAssetUrl } from "../config/api";
import { useToastContext } from "../context/ToastContextGlobal";
import ThemeToggle from "../components/ThemeToggle";
import ConfirmModal from "../components/ConfirmModal";
import { PLATFORM_CATEGORIES } from "../config/categories";
import { getCategoryFormConfig } from "../config/categoryFormConfig";

// Map a category display name (e.g. "Massage & Wellness") to the slug key used in config
const categoryNameToSlug = (name) => {
  const cat = PLATFORM_CATEGORIES.find((c) => c.name === name);
  return cat ? cat.slug : null;
};

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('blob:')) return path;
  return getAssetUrl(path);
};

function EditAdPageLuxury() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showSuccess, showError: showErrorToast } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [tabActive, setTabActive] = useState("basic");

  // ===== FORM STATE =====
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Escorts",
    location: "",
    age: "",
    gender: "Female",
    ethnicity: "",
    bodyType: "",
    languages: [],
    serviceFor: [],
    services: [],
    pricing: {},
    phone: "",
    email: "",
    whatsapp: "",
    incall: true,
    outcall: true,
    travelRadius: "",
  });

  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [existingVideos, setExistingVideos] = useState([]);
  const [categoryFields, setCategoryFields] = useState({});
  const [tagInput, setTagInput] = useState("");

  // Derive category config for non-escort ads
  const isEscort = formData.category === "Escorts";
  const categorySlug = categoryNameToSlug(formData.category);
  const categoryConfig = categorySlug ? getCategoryFormConfig(categorySlug) : null;
  const hasCategoryFields = categoryConfig && categoryConfig.fields && categoryConfig.fields.length > 0;
  const hasCategoryServices = categoryConfig && categoryConfig.services && categoryConfig.services.length > 0;
  const hasCategoryPricing = categoryConfig && categoryConfig.pricingTiers && categoryConfig.pricingTiers.length > 0;

  // Handlers for dynamic categoryFields editing
  const handleCategoryFieldChange = (key, value) => {
    setCategoryFields((prev) => ({ ...prev, [key]: value }));
    // Sync location to main form
    if (key === "location") handleInputChange("location", value);
  };
  const handleCategoryCheckboxField = (key, option) => {
    setCategoryFields((prev) => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(option) ? arr.filter((v) => v !== option) : [...arr, option] };
    });
  };
  const handleCategoryTagAdd = (key, e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const val = tagInput.trim();
    if (val && !(categoryFields[key] || []).includes(val)) {
      handleCategoryFieldChange(key, [...(categoryFields[key] || []), val]);
    }
    setTagInput("");
  };
  const handleCategoryTagRemove = (key, tag) => {
    handleCategoryFieldChange(key, (categoryFields[key] || []).filter((t) => t !== tag));
  };

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

  // ===== FETCH EXISTING DATA =====
  useEffect(() => {
    const fetchAd = async () => {
      try {
        const response = await api.get(`/ads/${id}`);
        const ad = response.data;

        setFormData({
          title: ad.title || "",
          description: ad.description || "",
          category: ad.category || "Escorts",
          location: ad.location || "",
          age: ad.age || "",
          gender: ad.gender || "Female",
          ethnicity: ad.ethnicity || "",
          bodyType: ad.bodyType || "",
          languages: ad.languages || [],
          serviceFor: ad.serviceFor || [],
          services: ad.services || [],
          pricing: ad.pricing || {},
          phone: ad.phone || "",
          email: ad.email || "",
          whatsapp: ad.whatsapp || "",
          incall: ad.profileFields?.incall !== false,
          outcall: ad.profileFields?.outcall !== false,
          travelRadius: ad.profileFields?.travelRadius || "",
        });

        setExistingImages(ad.images || []);
        setExistingVideos(ad.videos || []);
        // Pre-populate categoryFields, ensuring location is present for non-escort categories
        const loadedCategoryFields = ad.categoryFields || {};
        if (ad.category !== "Escorts" && !loadedCategoryFields.location && ad.location) {
          loadedCategoryFields.location = ad.location;
        }
        setCategoryFields(loadedCategoryFields);

        // Initialize enabled features based on data loaded
        setEnabledFeatures({
          profileFields: !!(ad.ethnicity || ad.bodyType || ad.gender),
          pricing: !!(ad.pricing && Object.keys(ad.pricing).length > 0),
          services: !!(ad.services && ad.services.length > 0),
          languages: !!(ad.languages && ad.languages.length > 0),
          serviceFor: !!(ad.serviceFor && ad.serviceFor.length > 0),
          contact: !!(ad.phone || ad.email || ad.whatsapp),
          locationServices: ad.profileFields?.incall !== undefined || ad.profileFields?.outcall !== undefined,
        });
      } catch (err) {
        setError("Failed to load ad");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [id]);

  // ===== VALIDATION =====
  const validateForm = () => {
    const errors = {};
    if (!formData.title) errors.title = "Headline is required";
    if (!formData.description) errors.description = "About You section is required";
    if (!formData.category) errors.category = "Category is required";
    if (!formData.location) errors.location = "Location is required";
    if (isEscort && !formData.age) errors.age = "Age is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== HANDLERS =====
  const toggleFeature = (feature) => {
    setEnabledFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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
    const MAX_SIZE = 5 * 1024 * 1024;

    files.forEach(file => {
      if (file.size > MAX_SIZE) {
        showErrorToast(`Image too large: ${file.name}`);
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

  const handleRemoveImage = (index, isExisting = false) => {
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showErrorToast("Video too large (max 50MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setVideos([{
        file,
        preview: evt.target.result
      }]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveVideo = (index, isExisting = false) => {
    if (isExisting) {
      setExistingVideos(prev => prev.filter((_, i) => i !== index));
    } else {
      setVideos(prev => prev.filter((_, i) => i !== index));
    }
  };

  // ===== SUBMIT =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm()) {
      showErrorToast("Please fill in all required fields");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        navigate("/login");
        return;
      }

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
      formDataObj.append("existingImages", JSON.stringify(existingImages));
      formDataObj.append("existingVideos", JSON.stringify(existingVideos));

      // Include categoryFields if present
      if (Object.keys(categoryFields).length > 0) {
        formDataObj.append("categoryFields", JSON.stringify(categoryFields));
      }

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

      // Add new images
      images.forEach((img) => {
        formDataObj.append("images", img.file);
      });

      // Add new videos
      videos.forEach((vid) => {
        formDataObj.append("videos", vid.file);
      });

      await api.put(`/ads/${id}/user`, formDataObj, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      showSuccess("Profile updated successfully!");
      setTimeout(() => {
        navigate(`/profile/${id}`);
      }, 1500);
    } catch (err) {
      console.error("Update error:", err);
      showErrorToast(err.response?.data?.message || "Failed to update profile");
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDelete = async () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteConfirmOpen(false);
    try {
      await api.delete(`/ads/${id}/user`);
      showSuccess("Profile deleted");
      setTimeout(() => {
        navigate("/my-ads");
      }, 1000);
    } catch (err) {
      showErrorToast("Failed to delete profile");
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white">Loading profile...</span>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <Helmet><title>Edit Ad | ReachRipple</title></Helmet>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/40 border-b border-blue-500/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/my-ads" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Edit Your Profile</h1>
              <p className="text-sm text-blue-300">Update your listing details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <Link to={`/profile/${id}`} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Home className="w-5 h-5 text-white" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-16 z-40 bg-slate-900/50 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: "basic", label: "Basic Info", icon: Edit2 },
              ...(isEscort ? [{ id: "profile", label: "Profile", icon: Heart }] : []),
              ...(!isEscort && hasCategoryFields ? [{ id: "category", label: `${categoryConfig.name} Details`, icon: CheckCircle2 }] : []),
              ...(isEscort ? [{ id: "services", label: "Services", icon: CheckCircle2 }] : []),
              { id: "media", label: "Media", icon: Camera },
              { id: "contact", label: "Contact", icon: Phone },
              { id: "settings", label: "Features", icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActive(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    tabActive === tab.id
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-white/60 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3 backdrop-blur">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3 backdrop-blur">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-200">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BASIC INFO TAB */}
          {tabActive === "basic" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Headline <span className="text-blue-500 font-bold ml-1" title="Required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      maxLength={100}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:outline-none transition-all ${
                        validationErrors.title ? "border-red-500 focus:border-red-600" : "border-white/20 focus:border-blue-500"
                      }`}
                    />
                    {validationErrors.title && (
                      <p className="text-red-400 text-xs mt-1">⚠️ {validationErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Description <span className="text-blue-500 font-bold ml-1" title="Required">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      maxLength={1000}
                      rows={6}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:outline-none transition-all resize-none ${
                        validationErrors.description ? "border-red-500 focus:border-red-600" : "border-white/20 focus:border-blue-500"
                      }`}
                    />
                    {validationErrors.description && (
                      <p className="text-red-400 text-xs mt-1">⚠️ {validationErrors.description}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange("category", e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none transition-all"
                    >
                      {PLATFORM_CATEGORIES.map((cat) => (
                        <option key={cat.slug} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE TAB - Escorts only */}
          {isEscort && tabActive === "profile" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Profile Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Location <span className="text-blue-500 font-bold ml-1" title="Required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white outline-none transition-all ${
                        validationErrors.location ? "border-red-500 focus:border-red-600" : "border-white/20 focus:border-blue-500"
                      }`}
                    />
                    {validationErrors.location && (
                      <p className="text-red-400 text-xs mt-1">⚠️ {validationErrors.location}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Age <span className="text-blue-500 font-bold ml-1" title="Required">*</span>
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={formData.age}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white outline-none transition-all ${
                        validationErrors.age ? "border-red-500 focus:border-red-600" : "border-white/20 focus:border-blue-500"
                      }`}
                    />
                    {validationErrors.age && (
                      <p className="text-red-400 text-xs mt-1">⚠️ {validationErrors.age}</p>
                    )}
                  </div>
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
                </div>

                {/* Languages */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/80 mb-3">Languages</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {LANGUAGES_LIST.map(lang => (
                      <label key={lang} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.languages.includes(lang)}
                          onChange={() => handleCheckboxArray("languages", lang)}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <span className="text-white/70">{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Service For */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">Services For</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {SERVICE_FOR.map(sf => (
                      <label key={sf} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.serviceFor.includes(sf)}
                          onChange={() => handleCheckboxArray("serviceFor", sf)}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <span className="text-white/70">{sf}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Incall / Outcall */}
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
              </div>
            </div>
          )}

          {/* CATEGORY DETAILS TAB - Non-escort categories */}
          {!isEscort && hasCategoryFields && tabActive === "category" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {categoryConfig.icon} {categoryConfig.name} Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryConfig.fields.map((field) => {
                    const val = categoryFields[field.key] ?? "";
                    switch (field.type) {
                      case "text":
                        return (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                              {field.label} {field.required && <span className="text-red-400">*</span>}
                            </label>
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => handleCategoryFieldChange(field.key, e.target.value)}
                              placeholder={field.placeholder || ""}
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                        );
                      case "number":
                        return (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                              {field.label} {field.required && <span className="text-red-400">*</span>}
                            </label>
                            <input
                              type="number"
                              value={val}
                              onChange={(e) => handleCategoryFieldChange(field.key, e.target.value)}
                              placeholder={field.placeholder || ""}
                              min={field.min}
                              max={field.max}
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                        );
                      case "select":
                        return (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                              {field.label} {field.required && <span className="text-red-400">*</span>}
                            </label>
                            <select
                              value={val}
                              onChange={(e) => handleCategoryFieldChange(field.key, e.target.value)}
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none focus:border-blue-500 transition-all"
                            >
                              <option value="">Select...</option>
                              {(field.options || []).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        );
                      case "checkboxes":
                        return (
                          <div key={field.key} className="md:col-span-2">
                            <label className="block text-sm font-medium text-white/80 mb-3">{field.label}</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {(field.options || []).map((opt) => (
                                <label key={opt} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={(categoryFields[field.key] || []).includes(opt)}
                                    onChange={() => handleCategoryCheckboxField(field.key, opt)}
                                    className="w-4 h-4 accent-blue-500"
                                  />
                                  <span className="text-white/70 text-sm">{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      case "tags":
                        return (
                          <div key={field.key} className="md:col-span-2">
                            <label className="block text-sm font-medium text-white/80 mb-2">{field.label}</label>
                            <input
                              type="text"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => handleCategoryTagAdd(field.key, e)}
                              placeholder={field.placeholder || "Type and press Enter"}
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 outline-none focus:border-blue-500 transition-all"
                            />
                            {(categoryFields[field.key] || []).length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {(categoryFields[field.key] || []).map((tag) => (
                                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                                    {tag}
                                    <button type="button" onClick={() => handleCategoryTagRemove(field.key, tag)} className="hover:text-white">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>

              {/* Category-specific Services */}
              {hasCategoryServices && (
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Services</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {categoryConfig.services.map((service) => (
                      <label key={service} className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.services.includes(service)}
                          onChange={() => handleCheckboxArray("services", service)}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <span className="text-white/70">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Category-specific Pricing */}
              {hasCategoryPricing && (
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">{categoryConfig.pricingLabel || "Pricing (GBP)"}</h2>
                  <div className="space-y-3">
                    {categoryConfig.pricingTiers.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-4">
                        <label className="text-white/70 text-sm w-40">{label}</label>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-white/50">£</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.pricing[key] || ""}
                            onChange={(e) => handlePricingChange(key, e.target.value)}
                            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white outline-none transition-all"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SERVICES TAB - Escorts use this, non-escorts get services in Category Details */}
          {isEscort && tabActive === "services" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Services & Pricing</h2>
                
                {/* Services */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-white/80 mb-3">Services</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SERVICES_LIST.map(service => (
                      <label key={service} className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10">
                        <input
                          type="checkbox"
                          checked={formData.services.includes(service)}
                          onChange={() => handleCheckboxArray("services", service)}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <span className="text-white/70">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
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
                            value={formData.pricing[key] || ""}
                            onChange={(e) => handlePricingChange(key, e.target.value)}
                            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white outline-none transition-all"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MEDIA TAB */}
          {tabActive === "media" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Photos & Videos</h2>
                
                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-medium text-white/80 mb-3">Your Current Photos</h3>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {existingImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={getImageUrl(typeof img === "string" ? img : img.url)}
                            alt={`Gallery item ${idx + 1}`}
                            className="w-full aspect-square object-contain rounded-lg bg-black/50"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx, true)}
                            className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Images */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-white/80 mb-4">Add More Photos</label>
                  
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={img.preview}
                            alt={`New upload ${idx + 1}`}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx, false)}
                            className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center justify-center w-full p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500/50 transition-colors cursor-pointer">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-white/70">Click to add more photos</p>
                      <p className="text-xs text-white/50 mt-1">Max 5MB per image</p>
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

                {/* Videos */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-4">Video</label>

                  {existingVideos.length > 0 && (
                    <div className="mb-4 relative">
                      <video 
                        src={typeof existingVideos[0] === "string" ? existingVideos[0] : existingVideos[0].url}
                        controls
                        className="w-full max-h-80 rounded-lg bg-black"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(0, true)}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}

                  {videos.length > 0 && (
                    <div className="mb-4 relative">
                      <video 
                        src={videos[0].preview}
                        controls
                        className="w-full max-h-80 rounded-lg bg-black"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(0, false)}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}

                  <label className="flex items-center justify-center w-full p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500/50 transition-colors cursor-pointer">
                    <div className="text-center">
                      <Video className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-white/70">Click to upload video</p>
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
            </div>
          )}

          {/* CONTACT TAB */}
          {tabActive === "contact" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

              </div>

              {/* Danger Zone */}
              <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 backdrop-blur-xl rounded-2xl border border-red-500/20 p-8">
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Danger Zone
                </h3>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Profile
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS/FEATURES TAB */}
          {tabActive === "settings" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                <h2 className="text-2xl font-bold text-white mb-2">Profile Features</h2>
                <p className="text-white/60 mb-8">Choose which advanced features from EscortProfilePage you'd like to include:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(FEATURE_DEFINITIONS).map(([key, def]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleFeature(key)}
                      className={`p-5 rounded-xl border-2 transition-all text-left ${
                        enabledFeatures[key]
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl">{def.icon}</span>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          enabledFeatures[key]
                            ? 'border-blue-500 bg-blue-500'
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

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-8">
                  <p className="text-sm text-blue-200">
                    💡 <strong>Tip:</strong> Enable or disable features anytime. Changes will be saved when you click "Save Changes".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="sticky bottom-0 py-4 bg-gradient-to-t from-slate-950 to-transparent pt-6 flex gap-4 justify-end">
            <Link
              to="/my-ads"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Profile"
        message="Are you sure you want to delete this profile? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

export default EditAdPageLuxury;
