import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/client";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(token ? "form" : "error"); // form | loading | success | error
  const [message, setMessage] = useState(token ? "" : "No reset token provided.");
  const [errors, setErrors] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (password !== confirmPassword) {
      setErrors(["Passwords do not match."]);
      return;
    }
    if (password.length < 8) {
      setErrors(["Password must be at least 8 characters."]);
      return;
    }

    setStatus("loading");
    try {
      const res = await api.post("/auth/reset-password", { token, password });
      setStatus("success");
      setMessage(res.data.message || "Password reset successfully!");
    } catch (err) {
      setStatus("form");
      const data = err.response?.data;
      if (data?.errors) {
        setErrors(data.errors);
      } else {
        setErrors([data?.message || "Failed to reset password. The link may be expired."]);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-100 dark:border-zinc-700 p-8">
        {status === "form" && (
          <>
            <h1 className="text-xl font-semibold text-zinc-800 dark:text-white text-center mb-2">Reset Your Password</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-center mb-6 text-sm">Enter your new password below.</p>

            {errors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-zinc-700 dark:text-white"
                  placeholder="Min 8 characters, 1 uppercase, 1 number"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-zinc-700 dark:text-white"
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
              >
                Reset Password
              </button>
            </form>
          </>
        )}

        {status === "loading" && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">Resetting your password...</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-800 dark:text-white">Password Reset!</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-800 dark:text-white">Invalid Link</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block px-6 py-2.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition font-medium"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
