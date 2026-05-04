// src/pages/CreateAdCategoryPage.jsx - Adaptive ad creation form per category
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, X, Camera, Video, Crop as CropIcon, Star,
} from "lucide-react";
import api from "../api/client";
import { sanitizeText, sanitizeHtml } from "../utils/security";
import { useToastContext } from "../context/ToastContextGlobal";
import { getCategoryFormConfig } from "../config/categoryFormConfig";
import { getCategoryBySlug } from "../config/categories";
import ImageEditorModal from "../components/ImageEditorModal";

// ===== ACCENT COLOR MAPS (Tailwind can't interpolate dynamic classes) =====
const BORDER_ACCENT = {
  purple: "border-purple-500", rose: "border-rose-500", blue: "border-blue-500",
  amber: "border-amber-500", green: "border-green-500", orange: "border-orange-500",
  slate: "border-slate-400", emerald: "border-emerald-500", yellow: "border-yellow-500",
  sky: "border-sky-500", pink: "border-pink-500",
};
const RING_ACCENT = {
  purple: "ring-purple-500/20", rose: "ring-rose-500/20", blue: "ring-blue-500/20",
  amber: "ring-amber-500/20", green: "ring-green-500/20", orange: "ring-orange-500/20",
  slate: "ring-slate-400/20", emerald: "ring-emerald-500/20", yellow: "ring-yellow-500/20",
  sky: "ring-sky-500/20", pink: "ring-pink-500/20",
};
const BG_ACCENT_LIGHT = {
  purple: "bg-purple-500/20", rose: "bg-rose-500/20", blue: "bg-blue-500/20",
  amber: "bg-amber-500/20", green: "bg-green-500/20", orange: "bg-orange-500/20",
  slate: "bg-slate-500/20", emerald: "bg-emerald-500/20", yellow: "bg-yellow-500/20",
  sky: "bg-sky-500/20", pink: "bg-pink-500/20",
};
const TEXT_ACCENT = {
  purple: "text-purple-300", rose: "text-rose-300", blue: "text-blue-300",
  amber: "text-amber-300", green: "text-green-300", orange: "text-orange-300",
  slate: "text-slate-300", emerald: "text-emerald-300", yellow: "text-yellow-300",
  sky: "text-sky-300", pink: "text-pink-300",
};
const GRADIENT_BAR = {
  purple: "from-purple-500 to-indigo-500", rose: "from-rose-400 to-pink-500",
  blue: "from-blue-500 to-cyan-500", amber: "from-amber-400 to-orange-500",
  green: "from-green-500 to-emerald-500", orange: "from-orange-400 to-amber-500",
  slate: "from-slate-400 to-zinc-500", emerald: "from-emerald-500 to-teal-500",
  yellow: "from-yellow-400 to-orange-500", sky: "from-sky-500 to-blue-500",
  pink: "from-pink-500 to-purple-500",
};

export default function CreateAdCategoryPage() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToastContext();

  const config = getCategoryFormConfig(categorySlug);
  const categoryMeta = getCategoryBySlug(categorySlug);

  // Redirect if config not found or uses dedicated page
  useEffect(() => {
    if (!config) {
      navigate("/create-ad", { replace: true });
    } else if (config.useDedicatedPage) {
      navigate(config.redirectTo, { replace: true });
    }
  }, [config, navigate]);

  // ===== STATE =====
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Form data – title, description, plus dynamic fields & tags
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryFields, setCategoryFields] = useState({}); // dynamic key/value from config.fields
  const [selectedServices, setSelectedServices] = useState([]);
  const [pricing, setPricing] = useState({});
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [tagInput, setTagInput] = useState(""); // for "tags" type fields
  const [editingImage, setEditingImage] = useState(null);

  const accent = config?.accentColor || "pink";

  // Determine which steps to show (skip steps with no content)
  const hasServices = config?.services && config.services.length > 0;
  const hasPricing = config?.pricingTiers && config.pricingTiers.length > 0;
  const hasStep2 = hasServices || hasPricing;

  // Steps: 1 = Details, 2 = Services/Pricing (optional), 3 = Media & Contact
  const totalSteps = hasStep2 ? 3 : 2;
  const mediaStep = hasStep2 ? 3 : 2;

  // ===== MOBILE KEYBOARD FIX =====
  useEffect(() => {
    const handleFocus = (e) => {
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      }
    };
    const inputs = document.querySelectorAll("input, textarea, select");
    inputs.forEach((el) => el.addEventListener("focus", handleFocus, { passive: true }));
    return () => inputs.forEach((el) => el.removeEventListener("focus", handleFocus));
  }, [currentStep]);

  if (!config || config.useDedicatedPage) return null;

  // ===== VALIDATION =====
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!title.trim()) errors.title = "Title is required";
      if (!description.trim()) errors.description = "Description is required";
      // Validate required category fields
      (config.fields || []).forEach((f) => {
        if (f.required && !categoryFields[f.key]) {
          errors[f.key] = `${f.label} is required`;
        }
      });
    }
    if (step === mediaStep) {
      if (images.length < 1) errors.images = "Upload at least 1 image";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== HANDLERS =====
  const handleFieldChange = (key, value) => {
    setCategoryFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckboxField = (key, value) => {
    setCategoryFields((prev) => {
      const arr = prev[key] || [];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handlePricingChange = (key, value) => {
    setPricing((prev) => ({ ...prev, [key]: value }));
  };

  const handleTagAdd = (key, e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !(categoryFields[key] || []).includes(val)) {
        handleFieldChange(key, [...(categoryFields[key] || []), val]);
      }
      setTagInput("");
    }
  };

  const handleTagRemove = (key, tag) => {
    handleFieldChange(key, (categoryFields[key] || []).filter((t) => t !== tag));
  };

  // ===== IMAGE / VIDEO UPLOAD =====
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        showToast(`Image too large: ${file.name} (max 5MB)`, "error");
        return;
      }
      if (images.length >= 12) {
        showToast("Maximum 12 images allowed", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => setImages((prev) => [...prev, { file, preview: evt.target.result }]);
      reader.readAsDataURL(file);
    });
  };
  const handleRemoveImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  // Image editor modal handlers
  const handleEditImage = (idx) => {
    const img = images[idx];
    if (!img) return;
    setEditingImage({
      index: idx,
      src: img.preview,
      filename: img.file?.name || `photo-${idx + 1}.jpg`,
    });
  };
  const handleEditorSave = ({ file, preview }) => {
    if (!editingImage) return;
    setImages((prev) => prev.map((it, i) => (i === editingImage.index ? { file, preview } : it)));
    setEditingImage(null);
  };
  const handleSetMain = (idx) => {
    if (idx === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      next.unshift(picked);
      return next;
    });
    showToast("Main photo updated");
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      showToast("Video too large (max 50MB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => setVideos((prev) => [...prev, { file, preview: evt.target.result }]);
    reader.readAsDataURL(file);
  };
  const handleRemoveVideo = (idx) => setVideos((prev) => prev.filter((_, i) => i !== idx));

  // ===== SUBMIT =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentStep < totalSteps) {
      if (!validateStep(currentStep)) {
        showToast("Please fill in all required fields", "error");
        return;
      }
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
      return;
    }

    // Final step validations
    if (images.length < 1) {
      showToast("Please upload at least 1 image", "error");
      return;
    }
    if (!agreeToTerms) {
      showToast("Please agree to terms and conditions", "error");
      return;
    }
    if (!title.trim() || !description.trim()) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) { navigate("/login"); return; }

      const fd = new FormData();
      fd.append("title", sanitizeText(title));
      fd.append("description", sanitizeHtml(description));
      fd.append("category", categoryMeta?.name || categorySlug);
      fd.append("categorySlug", categorySlug);

      // Location comes from categoryFields
      const loc = categoryFields.location || "";
      fd.append("location", sanitizeText(loc));

      // Derive a price from pricing tiers if present
      let price = 0;
      if (hasPricing) {
        const tierKeys = config.pricingTiers.map((t) => t.key);
        for (const k of tierKeys) {
          const v = parseFloat(pricing[k]);
          if (!isNaN(v) && v > 0) { price = v; break; }
        }
      }
      fd.append("price", price.toString());

      // Contact
      if (phone) fd.append("phone", phone);
      if (email) fd.append("email", email);
      if (website) fd.append("whatsapp", website); // reuse whatsapp field for now

      // Services
      if (selectedServices.length > 0) {
        fd.append("services", JSON.stringify(selectedServices));
      }

      // Pricing
      if (Object.keys(pricing).length > 0) {
        fd.append("pricing", JSON.stringify(pricing));
      }

      // Category-specific fields
      fd.append("categoryFields", JSON.stringify(categoryFields));

      // ProfileFields (map relevant category fields for indexed search)
      const profileFields = { location: loc };
      if (categoryFields.gender) profileFields.gender = categoryFields.gender;
      if (categoryFields.age) profileFields.age = parseInt(categoryFields.age) || undefined;
      fd.append("profileFields", JSON.stringify(profileFields));

      // Images
      images.forEach((img) => fd.append("images", img.file));
      // Videos
      videos.forEach((vid) => fd.append("videos", vid.file));

      await api.post("/ads", fd, { headers: { "Content-Type": "multipart/form-data" } });

      showToast("Ad created successfully! 🎉");
      setTimeout(() => navigate("/my-ads?created=1"), 1500);
    } catch (err) {
      console.error("Submit error:", err);
      showToast(err.response?.data?.error || err.response?.data?.message || "Failed to create ad", "error");
    } finally {
      setLoading(false);
    }
  };

  // ===== FIELD RENDERER =====
  const renderField = (field) => {
    const val = categoryFields[field.key] ?? "";
    const hasError = validationErrors[field.key];
    const borderClass = hasError
      ? "border-red-500 focus:border-red-500"
      : `border-white/20 focus:${BORDER_ACCENT[accent]}`;

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
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder || ""}
              className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 outline-none transition-all ${borderClass}`}
            />
            {hasError && <p className="text-xs text-red-400 mt-1">⚠️ {hasError}</p>}
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
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder || ""}
              min={field.min}
              max={field.max}
              className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 outline-none transition-all ${borderClass}`}
            />
            {hasError && <p className="text-xs text-red-400 mt-1">⚠️ {hasError}</p>}
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
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white outline-none transition-all ${borderClass}`}
            >
              <option value="">Select...</option>
              {(field.options || []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {hasError && <p className="text-xs text-red-400 mt-1">⚠️ {hasError}</p>}
          </div>
        );

      case "checkboxes":
        return (
          <div key={field.key} className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-3">
              {field.label}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(field.options || []).map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(categoryFields[field.key] || []).includes(opt)}
                    onChange={() => handleCheckboxField(field.key, opt)}
                    className={`w-4 h-4 accent-${accent}-500`}
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
            <label className="block text-sm font-medium text-white/80 mb-2">
              {field.label}
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => handleTagAdd(field.key, e)}
              placeholder={field.placeholder || "Type and press Enter"}
              className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 outline-none transition-all`}
            />
            {(categoryFields[field.key] || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(categoryFields[field.key] || []).map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${BG_ACCENT_LIGHT[accent]} ${TEXT_ACCENT[accent]}`}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(field.key, tag)}
                      className="hover:text-white transition-colors"
                    >
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
  };

  // ===== RENDER =====
  const gradientBar = GRADIENT_BAR[accent] || GRADIENT_BAR.pink;
  const textAcc = TEXT_ACCENT[accent] || TEXT_ACCENT.pink;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <Helmet>
        <title>Post {config.name} Ad | ReachRipple</title>
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/40 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/create-ad" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{config.icon}</span> {config.name}
              </h1>
              <p className={`text-sm ${textAcc}`}>
                Step {currentStep} of {totalSteps}
              </p>
            </div>
          </div>
        </div>
        {/* Stepper */}
        <div className="max-w-5xl mx-auto px-4 pb-4">
          {(() => {
            const stepLabels = hasStep2
              ? ["Details", "Pricing", "Photos & Contact"]
              : ["Details", "Photos & Contact"];
            return (
              <div className="flex items-center w-full">
                {stepLabels.map((label, i) => {
                  const stepNum = i + 1;
                  const isDone = stepNum < currentStep;
                  const isCurrent = stepNum === currentStep;
                  return (
                    <React.Fragment key={label}>
                      <div className="flex flex-col items-center min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                            isDone
                              ? `bg-gradient-to-r ${gradientBar} text-white shadow-md`
                              : isCurrent
                                ? `bg-gradient-to-r ${gradientBar} text-white ring-4 ring-white/20 scale-110`
                                : "bg-white/10 text-white/50"
                          }`}
                        >
                          {isDone ? "\u2713" : stepNum}
                        </div>
                        <span className={`mt-1.5 text-[11px] font-medium truncate max-w-[80px] sm:max-w-none ${isCurrent ? "text-white" : "text-white/50"}`}>
                          {label}
                        </span>
                      </div>
                      {i < stepLabels.length - 1 && (
                        <div className="flex-1 h-0.5 mx-2 -mt-5 bg-white/10 overflow-hidden rounded">
                          <div
                            className={`h-full bg-gradient-to-r ${gradientBar} transition-all duration-500`}
                            style={{ width: stepNum < currentStep ? "100%" : "0%" }}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </header>

      {/* Main */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ===== STEP 1: DETAILS ===== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              {/* Title & Description */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10">
                <h2 className="text-2xl font-bold text-white mb-6">Ad Details</h2>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={config.titlePlaceholder || "Enter a title..."}
                      maxLength={100}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:ring-2 ${RING_ACCENT[accent]} outline-none transition-all ${
                        validationErrors.title ? "border-red-500" : `border-white/20 focus:${BORDER_ACCENT[accent]}`
                      }`}
                    />
                    {validationErrors.title && (
                      <p className="text-xs text-red-400 mt-1">⚠️ {validationErrors.title}</p>
                    )}
                    <p className="text-xs text-white/50 mt-1">{title.length}/100</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {config.descriptionLabel || "Description"} <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={config.descriptionPlaceholder || "Describe your listing..."}
                      maxLength={2000}
                      rows={6}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:ring-2 ${RING_ACCENT[accent]} outline-none transition-all resize-none ${
                        validationErrors.description ? "border-red-500" : `border-white/20 focus:${BORDER_ACCENT[accent]}`
                      }`}
                    />
                    {validationErrors.description && (
                      <p className="text-xs text-red-400 mt-1">⚠️ {validationErrors.description}</p>
                    )}
                    <p className="text-xs text-white/50 mt-1">{description.length}/2000</p>
                  </div>
                </div>
              </div>

              {/* Category-specific fields */}
              {config.fields && config.fields.length > 0 && (
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    {config.name} Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.fields.map(renderField)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 2: SERVICES & PRICING (conditional) ===== */}
          {currentStep === 2 && hasStep2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {hasServices && hasPricing
                    ? "Services & Pricing"
                    : hasServices
                    ? "Services"
                    : "Pricing"}
                </h2>

                {/* Services checkboxes */}
                {hasServices && (
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-white/80 mb-3">
                      What do you offer?
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {config.services.map((svc) => (
                        <label
                          key={svc}
                          className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(svc)}
                            onChange={() => toggleService(svc)}
                            className="w-4 h-4 accent-purple-500"
                          />
                          <span className="text-white/70 text-sm">{svc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing tiers */}
                {hasPricing && (
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-4">
                      {config.pricingLabel || "Pricing (GBP)"}
                    </label>
                    <div className="space-y-3">
                      {config.pricingTiers.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-4">
                          <label className="text-white/70 text-sm w-40">{label}</label>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-white/50">£</span>
                            <input
                              type="number"
                              min="0"
                              value={pricing[key] || ""}
                              onChange={(e) => handlePricingChange(key, e.target.value)}
                              placeholder="0"
                              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 outline-none transition-all"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {config.priceNote && (
                      <p className="text-xs text-white/40 mt-3">💡 {config.priceNote}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== MEDIA & CONTACT STEP ===== */}
          {currentStep === mediaStep && (
            <div className="space-y-6 animate-fade-in">
              {/* Photos */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10">
                <h2 className="text-2xl font-bold text-white mb-3">Photos & Videos</h2>
                <div className="mb-5 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <span className="text-amber-300 text-sm">💡</span>
                  <p className="text-xs text-amber-100">
                    <span className="font-semibold">Tip:</span> Listings with 3+ photos get up to <span className="font-semibold">2× more replies</span>. The first image becomes your cover photo.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/80 mb-4">
                    Upload Photos (minimum 1)
                  </label>
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                      {images.map((img, idx) => (
                        <div key={idx} className={`relative group rounded-lg overflow-hidden border-2 ${idx === 0 ? "border-pink-500 shadow-lg shadow-pink-500/30" : "border-transparent"}`}>
                          <img
                            src={img.preview}
                            alt={`Upload ${idx + 1}`}
                            className="w-full aspect-square object-cover"
                          />
                          {idx === 0 && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-pink-500 text-white shadow flex items-center gap-1">
                              <Star className="w-3 h-3 fill-white" /> Main
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditImage(idx)}
                              title="Crop or rotate"
                              className="p-2 bg-white/90 hover:bg-white rounded-lg text-zinc-900"
                            >
                              <CropIcon className="w-4 h-4" />
                            </button>
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetMain(idx)}
                                title="Set as main photo"
                                className="p-2 bg-white/90 hover:bg-white rounded-lg text-pink-600"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              title="Remove"
                              className="p-2 bg-red-500 hover:bg-red-600 rounded-lg text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center w-full p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 transition-colors cursor-pointer">
                    <div className="text-center">
                      <Camera className={`w-8 h-8 ${textAcc} mx-auto mb-2`} />
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
                  {validationErrors.images && (
                    <p className="text-xs text-red-400 mt-2">⚠️ {validationErrors.images}</p>
                  )}
                </div>

                {/* Video */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-4">
                    Upload Video (optional)
                  </label>
                  {videos.length > 0 && (
                    <div className="mb-4 relative">
                      <video src={videos[0].preview} controls className="w-full max-h-80 rounded-lg bg-black" />
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(0)}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                  <label className="flex items-center justify-center w-full p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 transition-colors cursor-pointer">
                    <div className="text-center">
                      <Video className={`w-8 h-8 ${textAcc} mx-auto mb-2`} />
                      <p className="text-white/70">Drag video here or click to browse</p>
                      <p className="text-xs text-white/50 mt-1">Max 50MB</p>
                    </div>
                    <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10">
                <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
                <div className="space-y-4">
                  {(config.contactFields || ["phone", "email"]).includes("phone") && (
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+44 7700 900000"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 outline-none transition-all"
                      />
                    </div>
                  )}
                  {(config.contactFields || ["phone", "email"]).includes("email") && (
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@example.com"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 outline-none transition-all"
                      />
                    </div>
                  )}
                  {(config.contactFields || []).includes("website") && (
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Website</label>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://www.example.com"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* Terms */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="w-5 h-5 accent-purple-500 mt-1"
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
              onClick={() => {
                if (currentStep === 1) { navigate("/create-ad"); return; }
                setCurrentStep(currentStep - 1);
              }}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 1 ? "Categories" : "Back"}
            </button>

            <div className="text-white/60 text-sm">
              Step {currentStep} of {totalSteps}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`px-8 py-3 bg-gradient-to-r ${gradientBar} hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center gap-2`}
            >
              {currentStep === totalSteps ? (
                <>
                  <Check className="w-4 h-4" />
                  {loading ? "Creating..." : "Post Ad"}
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

      {editingImage && (
        <ImageEditorModal
          src={editingImage.src}
          filename={editingImage.filename}
          aspect={4 / 3}
          onCancel={() => setEditingImage(null)}
          onSave={handleEditorSave}
        />
      )}
    </div>
  );
}
