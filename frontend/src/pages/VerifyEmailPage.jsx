import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/client";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState(token ? "verifying" : "prompt"); // verifying | success | error | prompt
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim() || resendLoading) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await api.post("/auth/resend-verification-public", { email: resendEmail.trim() });
      setResendMessage(res.data?.message || "If that account exists and is unverified, a new verification email has been sent.");
    } catch (err) {
      setResendMessage("If that account exists and is unverified, a new verification email has been sent.");
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      // Neutral prompt state — user landed without a token
      return;
    }

    const verify = async () => {
      try {
        const res = await api.post("/auth/verify-email", { token });
        setStatus("success");
        setMessage(res.data.message || "Email verified successfully!");
      } catch (err) {
        setStatus("error");
        setMessage(
          err.response?.data?.message || "Invalid or expired verification token."
        );
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-100 dark:border-zinc-700 p-8 text-center">
        {status === "verifying" && (
          <>
            <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-zinc-800 dark:text-white">Verifying your email...</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-800 dark:text-white">Email Verified!</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block px-6 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition font-medium"
            >
              Go to Login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-800 dark:text-white">Verification Failed</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">{message}</p>

            <form onSubmit={handleResend} className="mt-6 text-left space-y-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Resend verification email
              </label>
              <input
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                disabled={resendLoading || !resendEmail.trim()}
                className="w-full px-4 py-2.5 rounded-lg bg-rose-500 text-white font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {resendLoading ? "Sending..." : "Resend verification email"}
              </button>
              {resendMessage && (
                <p className="text-sm text-green-600 dark:text-green-400">{resendMessage}</p>
              )}
            </form>

            <Link
              to="/login"
              className="mt-6 inline-block px-6 py-2.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition font-medium"
            >
              Back to Login
            </Link>
          </>
        )}

        {status === "prompt" && (
          <>
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-800 dark:text-white">Check your inbox</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              We sent a verification link to your email. Click it to activate your account.
            </p>

            <form onSubmit={handleResend} className="mt-6 text-left space-y-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Didn't get it? Resend
              </label>
              <input
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                disabled={resendLoading || !resendEmail.trim()}
                className="w-full px-4 py-2.5 rounded-lg bg-rose-500 text-white font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {resendLoading ? "Sending..." : "Resend verification email"}
              </button>
              {resendMessage && (
                <p className="text-sm text-green-600 dark:text-green-400">{resendMessage}</p>
              )}
            </form>

            <Link
              to="/login"
              className="mt-6 inline-block px-6 py-2.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition font-medium"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
