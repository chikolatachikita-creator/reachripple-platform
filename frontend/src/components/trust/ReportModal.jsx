import React, { useState } from "react";
import api from "../../api/client";

const REPORT_REASONS = [
  { value: "underage", label: "Suspected under 18" },
  { value: "exploitation", label: "Exploitation / Trafficking" },
  { value: "harassment", label: "Harassment / Threats" },
  { value: "fraud", label: "Fraud / Scam" },
  { value: "impersonation", label: "Impersonation / Fake profile" },
  { value: "illegal", label: "Illegal activity" },
  { value: "spam", label: "Spam / Duplicate" },
  { value: "other", label: "Other" },
];

/**
 * useReportModal — Hook that provides a report modal for ads/profiles.
 *
 * Usage:
 *   const { openReportModal, ReportModal } = useReportModal({ showToast });
 *   <button onClick={() => openReportModal(adId)}>Report</button>
 *   <ReportModal />
 */
export function useReportModal({ showToast, showSuccess, showError } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [adId, setAdId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toast = (msg, type) => {
    if (type === "success" && showSuccess) showSuccess(msg);
    else if (type === "error" && showError) showError(msg);
    else if (showToast) showToast(msg, type);
  };

  const openReportModal = (targetAdId) => {
    setAdId(targetAdId);
    setReason("");
    setDescription("");
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    setIsOpen(false);
    document.body.style.overflow = "";
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast("Please select a reason", "error");
      return;
    }
    if (!description.trim() && reason === "other") {
      toast("Please describe the issue", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/reports", {
        adId,
        reason: REPORT_REASONS.find((r) => r.value === reason)?.label || reason,
        description: description.trim() || undefined,
      });
      toast("Report submitted. Thank you for helping keep the community safe.", "success");
      close();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to submit report. Please try again.";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  function ReportModalComponent() {
    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={close}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-lg">🚩</span>
              </div>
              <h3 id="report-modal-title" className="text-lg font-bold text-zinc-900">
                Report This Ad
              </h3>
            </div>
            <button
              onClick={close}
              className="text-zinc-400 hover:text-zinc-600 text-xl leading-none p-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Urgency notice */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs text-red-700">
              <strong>⚠️ Immediate danger?</strong> If someone is in immediate danger,
              please contact your local emergency services (999/112) before filing a report.
            </p>
          </div>

          {/* Reason dropdown */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Reason for report <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-zinc-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
            >
              <option value="">Select a reason…</option>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description textarea */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Additional details {reason === "other" && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide any additional information that may help our team investigate…"
              rows={3}
              maxLength={1000}
              className="w-full border border-zinc-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
            />
            <p className="text-xs text-zinc-400 mt-1">{description.length}/1000</p>
          </div>

          {/* Submit */}
          <div className="space-y-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason}
              className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Report"
              )}
            </button>
            <button
              onClick={close}
              className="w-full py-2.5 rounded-xl text-zinc-500 font-medium text-sm hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
            All reports are reviewed by our moderation team within 24 hours.
            False or malicious reports may result in account suspension.
          </p>
        </div>
      </div>
    );
  }

  return {
    openReportModal,
    ReportModal: ReportModalComponent,
  };
}

export default useReportModal;
