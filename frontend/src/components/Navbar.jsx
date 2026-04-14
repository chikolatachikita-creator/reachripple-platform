import React, { useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import NotificationCenter from "./NotificationCenter";
import { useAuth } from "../context/AuthContext";

/**
 * Navbar Component - Shared navigation bar
 * 
 * Used on: ReachRipple pages including Home, SearchResults, and other public pages
 * 
 * Features:
 * - Theme toggle
 * - Notification center (when logged in)
 * - User info display
 * - Admin dashboard link (when admin)
 * - Login/Signup or Logout buttons
 */
export default function Navbar({ showSaved = true }) {
  const { isLoggedIn, user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);



  return (
    <nav className="w-full bg-white dark:bg-slate-900 sticky top-0 z-50 shadow-sm border-b border-slate-100 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow" />
          <div className="text-sm font-bold leading-tight"><span className="text-pink-500">Reach</span><span className="text-purple-600">Ripple</span></div>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isLoggedIn && <NotificationCenter />}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-target flex items-center justify-center"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {isLoggedIn ? (
            <>
              {/* User info - hidden on small screens */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">{user.email}</p>
                </div>
              </div>

              {/* Admin Dashboard Link */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:brightness-110 transition-all"
                >
                  Admin
                </Link>
              )}

              {/* My Ads */}
              <Link
                to="/my-ads"
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors hidden sm:block dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                My Ads
              </Link>

              {/* Help */}
              <Link
                to="/help"
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors hidden sm:block dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span role="img" aria-label="Help">❓</span> Help
              </Link>

              {/* Logout */}
              <button
                onClick={logout}
                className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-700 hover:bg-red-50 transition-colors dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Saved - only show if prop allows */}
              {showSaved && (
                <Link
                  to="/saved"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors hidden sm:block dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <span role="img" aria-label="Saved">💖</span> Saved
                </Link>
              )}

              {/* Help */}
              <Link
                to="/help"
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors hidden sm:block dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span role="img" aria-label="Help">❓</span> Help
              </Link>

              {/* Login */}
              <Link
                to="/login"
                className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Log in
              </Link>

              {/* Sign Up */}
              <Link
                to="/signup"
                className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:brightness-110 transition-all shadow-sm"
              >
                Sign Up
              </Link>

              {/* Post an Ad */}
              <Link
                to="/create-ad"
                className="hidden sm:inline-flex px-5 py-2 rounded-xl text-white font-semibold shadow-md bg-gradient-to-r from-pink-500 via-purple-500 to-blue-900 hover:brightness-110 transition-all"
              >
                Post an Ad
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="sm:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Panel */}
          <div className="sm:hidden fixed top-16 right-0 w-[min(80vw,320px)] max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 shadow-2xl z-50 border-l border-slate-200 dark:border-slate-700 overflow-y-auto animate-slide-in-right safe-area-right">
            <div className="p-4 space-y-1">
              {isLoggedIn ? (
                <>
                  {/* User info */}
                  <div className="px-3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 mb-3">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  {/* My Listings section */}
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">My Listings</p>

                  <Link to="/my-ads" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    My Ads
                  </Link>

                  <Link to="/saved" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    Saved Profiles
                  </Link>

                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Dashboard & Analytics
                  </Link>

                  {/* Support section */}
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">Support</p>

                  <Link to="/help" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    Help & FAQ
                  </Link>

                  <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                    <button
                      onClick={() => { setMobileMenuOpen(false); logout(); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {showSaved && (
                    <Link to="/saved" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      Saved Profiles
                    </Link>
                  )}

                  <Link to="/help" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    Help & FAQ
                  </Link>

                  <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 space-y-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-3 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      Log in
                    </Link>
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:brightness-110 transition-all">
                      Sign Up
                    </Link>
                    <Link to="/create-ad" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-900 text-white hover:brightness-110 transition-all">
                      Post an Ad
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
