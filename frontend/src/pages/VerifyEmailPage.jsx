import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/client";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-zinc-100 p-8 text-center">
        {status === "verifying" && (
          <>
            <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-zinc-800">Verifying your email...</h1>
            <p className="text-zinc-500 mt-2">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-800">Email Verified!</h1>
            <p className="text-zinc-500 mt-2">{message}</p>
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
            <h1 className="text-xl font-semibold text-zinc-800">Verification Failed</h1>
            <p className="text-zinc-500 mt-2">{message}</p>
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
