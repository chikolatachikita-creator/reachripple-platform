import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Global mobile bottom navigation.
 *
 * Rendered once at the App root and shown on phones (<md). Hidden on:
 *  - any admin route (admin layout has its own nav),
 *  - auth flows (login / signup / verify / reset / oauth callback),
 *  - search results & category browse pages (those have a page-specific bar
 *    with a Filters button that is more useful in context).
 */
export default function MobileBottomBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const HIDDEN_PREFIXES = [
    "/admin",
    "/login",
    "/signup",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/auth/",
    "/escort/",
    "/category/",
    "/search",
  ];
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return null;
  }

  const isHome = pathname === "/" || pathname === "/escorts" || pathname === "/classifieds";

  const Btn = ({ to, onClick, label, active = false, primary = false, children }) => {
    const base =
      "flex-1 rounded-xl px-2 py-2.5 text-center text-[11px] font-semibold " +
      "active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5";
    const cls = primary
      ? `${base} bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-600/25`
      : active
      ? `${base} bg-blue-50 text-blue-600`
      : `${base} text-zinc-700 hover:bg-zinc-100`;
    return to ? (
      <Link to={to} className={cls} aria-label={label}>
        {children}
        <span>{label}</span>
      </Link>
    ) : (
      <button type="button" onClick={onClick} className={cls} aria-label={label}>
        {children}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 bottom-3 w-[min(440px,calc(100%-24px))]
                 rounded-2xl bg-white/95 p-1 shadow-2xl shadow-black/15 backdrop-blur-xl
                 border border-zinc-200/80 flex gap-1 md:hidden z-50 safe-area-bottom mobile-bottom-bar"
      aria-label="Primary mobile navigation"
    >
      <Btn to="/" label="Home" active={isHome}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
        </svg>
      </Btn>

      <Btn to="/escort/gb" label="Browse" active={pathname.startsWith("/escort")}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </Btn>

      <Btn
        onClick={() => navigate(isLoggedIn ? "/create-ad" : "/login")}
        label="Post"
        primary
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M12 4v16m8-8H4" />
        </svg>
      </Btn>

      <Btn to="/saved" label="Saved" active={pathname.startsWith("/saved")}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
        </svg>
      </Btn>

      <Btn
        to={isLoggedIn ? "/account" : "/login"}
        label={isLoggedIn ? "Account" : "Sign in"}
        active={pathname.startsWith("/account") || pathname.startsWith("/dashboard")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5.121 17.804A9 9 0 1118.879 6.196M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Btn>
    </nav>
  );
}
