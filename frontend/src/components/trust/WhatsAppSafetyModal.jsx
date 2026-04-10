import React, { useState } from "react";

/**
 * WhatsAppSafetyModal — Interstitial safety warning before redirecting to WhatsApp.
 * Educates users about common scams + provides a report path.
 *
 * Usage:
 *   const { openSafetyModal, WhatsAppSafetyModal } = useWhatsAppSafety();
 *   <button onClick={() => openSafetyModal(phoneNumber, adId)}>WhatsApp</button>
 *   <WhatsAppSafetyModal />
 */

export function useWhatsAppSafety() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [adId, setAdId] = useState("");
  const [onReport, setOnReport] = useState(null);

  const normalizePhone = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("0")) return "44" + digits.slice(1);
    return digits.startsWith("44") ? digits : digits;
  };

  const openSafetyModal = (phoneNumber, targetAdId, reportCallback) => {
    setPhone(phoneNumber);
    setAdId(targetAdId || "");
    setOnReport(() => reportCallback || null);
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    setIsOpen(false);
    document.body.style.overflow = "";
  };

  const continueToWhatsApp = () => {
    const normalized = normalizePhone(phone);
    const msg = encodeURIComponent("Hi! I saw your profile on ReachRipple and would like to connect.");
    window.open(`https://wa.me/${normalized}?text=${msg}`, "_blank", "noopener,noreferrer");
    close();
  };

  const handleReport = () => {
    close();
    if (onReport) onReport();
  };

  function WhatsAppSafetyModalComponent() {
    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={close}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-safety-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.676-1.225A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.993-1.957l-.418-.312-2.774.727.741-2.71-.342-.544A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
              </svg>
            </div>
            <h3 id="wa-safety-title" className="text-lg font-bold text-zinc-900">
              Before You Contact
            </h3>
          </div>

          {/* Safety warnings */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
              ⚠️ Stay Safe — Read Before Continuing
            </h4>
            <ul className="text-xs text-amber-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold mt-0.5">✕</span>
                <span><strong>Never send deposits or advance payments</strong> — legitimate advertisers do not ask for money before meeting.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold mt-0.5">✕</span>
                <span><strong>Never share your ID, passport, or bank details</strong> — this information can be used for identity theft.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold mt-0.5">✕</span>
                <span><strong>Never agree to meet in isolated locations</strong> — always choose public or well-known places for first meetings.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span><strong>If threatened or pressured</strong> — stop communication immediately and report the advertiser.</span>
              </li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={continueToWhatsApp}
              className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
              I understand — Continue to WhatsApp
            </button>

            {adId && (
              <button
                onClick={handleReport}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                🚩 Report this advertiser
              </button>
            )}

            <button
              onClick={close}
              className="w-full py-2.5 rounded-xl text-zinc-500 font-medium text-sm hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
            ReachRipple is not responsible for off-platform interactions.
            Always exercise caution when contacting advertisers.
          </p>
        </div>
      </div>
    );
  }

  return {
    openSafetyModal,
    WhatsAppSafetyModal: WhatsAppSafetyModalComponent,
  };
}

export default useWhatsAppSafety;
