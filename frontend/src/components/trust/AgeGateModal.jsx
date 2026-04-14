// src/components/trust/AgeGateModal.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

const AGE_GATE_KEY = "rr_age_verified";

// Routes that contain adult content and require age verification
const ADULT_PATHS = [
  "/escorts", "/escort/", "/profile/",
  "/category/massage", "/category/dating",
  "/category/alternative", "/category/entertainment",
];

/**
 * Check if user has verified age — used by the gate and by page guards.
 */
export function isAgeVerified() {
  return localStorage.getItem(AGE_GATE_KEY) === "true";
}

/**
 * AgeGateModal — Full-screen age verification splash.
 * Only shown on adult-content routes (escorts, massage, dating, alternative, entertainment).
 * General categories (jobs, vehicles, property, pets, buy-sell, community) are not gated.
 * Stores consent in localStorage so it persists across sessions.
 */
export default function AgeGateModal() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (isAgeVerified()) {
      setVisible(false);
      return;
    }
    const isAdultRoute = ADULT_PATHS.some((p) => location.pathname.startsWith(p));
    if (isAdultRoute) {
      setVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [location.pathname]);

  const handleConfirm = () => {
    localStorage.setItem(AGE_GATE_KEY, "true");
    document.body.style.overflow = "";
    setVisible(false);
  };

  const handleDecline = () => {
    window.location.href = "https://www.google.com";
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-blue-900 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-500/25">
          <span className="text-white font-black text-xl">RR</span>
        </div>

        <h2 id="age-gate-title" className="text-2xl font-black text-zinc-900 mb-2">
          Age Verification Required
        </h2>
        <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
          This website contains adult content. By continuing, you confirm that
          you are at least <strong>18 years old</strong> and that viewing adult
          content is legal in your jurisdiction.
        </p>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>Platform Disclaimer:</strong> ReachRipple is a classifieds
            platform. We do not participate in, endorse, or facilitate any
            illegal activity. All users must comply with applicable laws. Ads
            are user-generated content; we verify but do not guarantee accuracy.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            I am 18 or older — Enter
          </button>
          <button
            onClick={handleDecline}
            className="w-full py-3 rounded-xl border border-zinc-200 text-zinc-600 font-medium text-sm hover:bg-zinc-50 transition-colors"
          >
            I am under 18 — Leave
          </button>
        </div>

        <p className="mt-4 text-[11px] text-zinc-400">
          By entering, you agree to our{" "}
          <a href="/terms" className="underline hover:text-zinc-600">Terms of Service</a>{" "}
          and <a href="/privacy" className="underline hover:text-zinc-600">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
