import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, Upload, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useToastContext } from "../context/ToastContextGlobal";
import { getVerificationStatus, submitVerificationRequest } from "../api/verification";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE_MB = 5;

export default function VerificationPage() {
  const { showSuccess, showError } = useToastContext();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null); // none | pending | verified | rejected
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getVerificationStatus();
        setStatus(data.idVerificationStatus);
        setVerifiedAt(data.idVerifiedAt);
      } catch {
        showError("Failed to load verification status");
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      showError("Only JPG, PNG, and PDF files are accepted");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showError(`File must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      showError("Please select an ID document");
      return;
    }

    setSubmitting(true);
    try {
      await submitVerificationRequest(selectedFile);
      setStatus("pending");
      setSelectedFile(null);
      setPreview(null);
      showSuccess("Verification request submitted successfully");
    } catch (err) {
      showError(err?.response?.data?.error || "Failed to submit verification");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      );
    }

    if (status === "verified") {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">ID Verified</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-1">
            Your identity has been verified successfully.
          </p>
          {verifiedAt && (
            <p className="text-sm text-zinc-400">
              Verified on {new Date(verifiedAt).toLocaleDateString()}
            </p>
          )}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
      );
    }

    if (status === "pending") {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Verification Pending</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-1">
            Your ID document has been submitted and is awaiting review.
          </p>
          <p className="text-sm text-zinc-400">
            We'll notify you once your verification has been processed.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
      );
    }

    // status === "none" or "rejected"
    return (
      <div>
        {status === "rejected" && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">Previous request rejected</p>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                Your previous verification was not approved. Please submit a clearer document.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">Upload ID Document</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Upload a clear photo or scan of a government-issued ID (passport, driving licence, or national ID card).
              Accepted formats: JPG, PNG, PDF. Max size: {MAX_SIZE_MB}MB.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {preview ? (
              <div className="space-y-3">
                <img src={preview} alt="ID preview" className="max-h-48 mx-auto rounded-lg shadow" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedFile?.name}</p>
                <p className="text-xs text-zinc-400">Click to change</p>
              </div>
            ) : selectedFile ? (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{selectedFile.name}</p>
                <p className="text-xs text-zinc-400">Click to change</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Click to upload your ID document
                </p>
                <p className="text-xs text-zinc-400">JPG, PNG, or PDF up to {MAX_SIZE_MB}MB</p>
              </div>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-semibold mb-1">Privacy Notice</p>
              <p>Your ID document is stored securely and only viewed by authorised staff for verification purposes. It is never shared with other users.</p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedFile || submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Submit for Verification
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-gray-900 dark:to-gray-950 flex flex-col">
      <Helmet><title>ID Verification | ReachRipple</title></Helmet>
      <Navbar />

      <div className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700 p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-7 h-7 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">ID Verification</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                Verify your identity to earn a trusted badge on your profile.
              </p>
            </div>
            {renderStatusContent()}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
