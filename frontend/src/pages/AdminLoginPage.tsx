import React, { useState } from "react";
import { adminLogin } from "../api/auth";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await adminLogin(email, password);
      if (user) {
        if (user.role !== "admin") {
          setError("Only administrators can access this area");
          return;
        }
        localStorage.setItem("userId", user._id);
        localStorage.setItem("userName", user.name);
        localStorage.setItem("userEmail", user.email);
        localStorage.setItem("userRole", user.role);
        window.location.href = "/admin/dashboard";
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="flex justify-center mb-4">
          <img src="/logomark.png" alt="ReachRipple" className="w-20 h-20 rounded-2xl object-cover shadow-xl" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">
          Admin Login
        </h1>
        <p className="text-xs text-slate-500 mb-6 text-center">
          Private access for <span className="font-semibold"><span className="text-pink-500">Reach</span><span className="text-purple-600">Ripple</span></span> admins.
        </p>

        {error && (
          <p className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-700 text-white text-sm font-semibold py-2.5 shadow-md hover:shadow-lg hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Log in as Admin"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-slate-400 text-center">
          Contact administrator for credentials
        </p>
      </div>
    </div>
  );
}
