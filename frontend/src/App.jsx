import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProviderGlobal } from "./context/ToastContextGlobal";
// import { SocketProvider } from "./context/SocketContext"; // Removed: in-app messaging deleted
import ErrorBoundary from "./components/ErrorBoundary";
import SkipLink from "./components/ui/SkipLink";
import ScrollToTop from "./components/ScrollToTop";
import AgeGateModal from "./components/trust/AgeGateModal";
// import SupportChatWidget from "./components/SupportChatWidget"; // Removed: support chat widget deleted

// Public pages
import MainHomePage from "./pages/MainHomePage.jsx";
import EscortsHomePage from "./pages/EscortsHomePage.jsx";
import SearchResultsPage from "./pages/SearchResultsPage.jsx";
import EscortProfilePage from "./pages/EscortProfilePage_Cinematic.jsx";
import SavedProfilesPage from "./pages/SavedProfilesPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.tsx";
import OAuthCallbackPage from "./pages/OAuthCallbackPage.tsx";
import AgencyPublisherPage from "./pages/AgencyPublisherPage.jsx";

// User pages
import UserDashboardPage from "./pages/UserDashboardPage.jsx";
import CreateAdPageLuxury from "./pages/CreateAdPage_Luxury.jsx";
import CategorySelectPage from "./pages/CategorySelectPage.jsx";
import CreateAdCategoryPage from "./pages/CreateAdCategoryPage.jsx";
import EditAdPageLuxury from "./pages/EditAdPage_Luxury.jsx";
import UserProfilePage from "./pages/UserProfilePage.jsx";
import MyAdsPage from "./pages/MyAdsPage.jsx";
import HelpPage from "./pages/HelpPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
// import ChatPage from "./pages/ChatPage.jsx"; // Removed: messaging via SMS
// import BuyCreditsPage from "./pages/BuyCreditsPage.tsx"; // Removed: credits system replaced with direct pricing

// Admin pages
import AdminDashboardPage from "./pages/AdminDashboardPage.tsx";
import AdminUsersPage from "./pages/AdminUsersPage.tsx";
import AdminAdsPage from "./pages/AdminAdsPage.tsx";
import AdminReportsPage from "./pages/AdminReportsPage.tsx";
import AdminSettingsPage from "./pages/AdminSettingsPage.tsx";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage.tsx";
import AdminModerationPage from "./pages/AdminModerationPage.tsx";
import AdminRevenuePage from "./pages/AdminRevenuePage.tsx";
import AdminNetworkPage from "./pages/AdminNetworkPage.tsx";
import SafetyPage from "./pages/SafetyPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import TermsPage from "./pages/TermsPage.jsx";
import PrivacyPage from "./pages/PrivacyPage.jsx";
import CookiePolicyPage from "./pages/CookiePolicyPage.jsx";
import ModernSlaveryPage from "./pages/ModernSlaveryPage.jsx";
import LawEnforcementPage from "./pages/LawEnforcementPage.jsx";
import OnlineSafetyPage from "./pages/OnlineSafetyPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import CategoryPage from "./pages/CategoryPage.jsx";
import GrowthDashboardPage from "./pages/GrowthDashboardPage.jsx";
import TierSelectionPage from "./pages/TierSelectionPage.jsx";
import UserAnalyticsPage from "./pages/UserAnalyticsPage.jsx";
import VerificationPage from "./pages/VerificationPage.jsx";

// Layout
import AdminLayout from "./layouts/AdminLayout.tsx";

// ===== VIVASTREET-STYLE ROUTING (Option A: /:categorySlug/:locationSlug) =====
// Legacy route redirect component (preserves query string)
function LegacyCategoryRedirect({ categorySlug }) {
  const { location: legacyLocation } = useParams(); // from /escorts/:location
  const loc = useLocation();
  const query = loc.search || "";
  // Redirect to new unified /escort/:location route (using categorySlug for potential future use)
  const targetCategory = categorySlug === "escorts" ? "escort" : categorySlug;
  return <Navigate to={`/${targetCategory}/${legacyLocation || "gb"}${query}`} replace />;
}


// Legacy /search route redirect component (preserves query string)
function LegacySearchRedirect() {
  const loc = useLocation();
  const query = loc.search || "";
  return <Navigate to={`/escort/gb${query}`} replace />;
}

// Redirect /ads/:id → /profile/:id (single canonical profile page)
function AdsRedirect() {
  const { id } = useParams();
  return <Navigate to={`/profile/${id}`} replace />;
}

// Auth-aware route guards using React context (re-render on auth state change)
function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-white">
      <div className="text-center">
        <img src="/logomark.png" alt="ReachRipple" className="w-14 h-14 rounded-xl object-cover shadow-lg mx-auto mb-4 animate-pulse" />
        <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
      </div>
    </div>
  );
}

function RequireUser({ children }) {
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  if (isLoading) return <AuthLoadingSpinner />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function RequireAuth({ children }) {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return <AuthLoadingSpinner />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <AuthProvider>
              <ToastProviderGlobal>
                  <AgeGateModal />
                  <SkipLink />
                  <ScrollToTop />
                  <main id="main-content">
                  <Routes>

            {/* PUBLIC ROUTES */}
            <Route path="/" element={<MainHomePage />} />
            
            {/* ===== VIVASTREET-STYLE UNIFIED ROUTE ===== */}
            {/* Pattern: /escort/:location (e.g., /escort/gb, /escort/london) */}
            <Route path="/escort/:location" element={<SearchResultsPage />} />
            
            {/* Specific /escorts route for homepage */}
            <Route path="/escorts" element={<EscortsHomePage />} />
            
            {/* Category pages (non-escort categories) */}
            <Route path="/category/:categorySlug" element={<CategoryPage />} />
            
            {/* Legacy /search route → redirect to /escort/gb (preserves query) */}
            <Route path="/search" element={<LegacySearchRedirect />} />
            
            <Route path="/profile/:id" element={<EscortProfilePage />} />
            <Route path="/ads/:id" element={<AdsRedirect />} />
            <Route path="/publisher/:userId" element={<AgencyPublisherPage />} />
            
            {/* Category without location → redirect to /:categorySlug/gb */}
            {/* Note: These are now unnecessary with /:cat/:loc route, but keeping for completeness */}
            {/* <Route path="/escorts" element={<Navigate to="/escorts/gb" replace />} /> */}
            {/* <Route path="/adult-entertainment" element={<Navigate to="/adult-entertainment/gb" replace />} /> */}
            {/* <Route path="/personals" element={<Navigate to="/personals/gb" replace />} /> */}
            
            {/* Legacy redirects (keep old links alive) */}
            <Route path="/escorts/:location" element={<LegacyCategoryRedirect categorySlug="escorts" />} />
            <Route path="/adult-entertainment/:location" element={<LegacyCategoryRedirect categorySlug="adult-entertainment" />} />
            <Route path="/personals/:location" element={<LegacyCategoryRedirect categorySlug="personals" />} />
            
          <Route path="/saved" element={<RequireAuth><SavedProfilesPage /></RequireAuth>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/:provider/callback" element={<OAuthCallbackPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* USER PROTECTED ROUTES (REGULAR USERS ONLY - NOT ADMIN) */}
          <Route 
            path="/dashboard" 
            element={<RequireUser><UserDashboardPage /></RequireUser>} 
          />
          <Route 
            path="/create-ad" 
            element={<RequireUser><CategorySelectPage /></RequireUser>} 
          />
          <Route 
            path="/create-ad/escort-form" 
            element={<RequireUser><CreateAdPageLuxury /></RequireUser>} 
          />
          <Route 
            path="/create-ad/:categorySlug" 
            element={<RequireUser><CreateAdCategoryPage /></RequireUser>} 
          />
          <Route 
            path="/account" 
            element={<RequireUser><UserProfilePage /></RequireUser>} 
          />
          <Route 
            path="/edit-ad/:id" 
            element={<RequireUser><EditAdPageLuxury /></RequireUser>} 
          />
          <Route 
            path="/my-ads" 
            element={<RequireUser><MyAdsPage /></RequireUser>} 
          />
          {/* BuyCreditsPage removed — credits system replaced with direct pricing */}
          <Route 
            path="/growth" 
            element={<RequireUser><GrowthDashboardPage /></RequireUser>} 
          />
          <Route 
            path="/pricing" 
            element={<RequireUser><TierSelectionPage /></RequireUser>} 
          />
          <Route 
            path="/analytics" 
            element={<RequireUser><UserAnalyticsPage /></RequireUser>} 
          />
          <Route 
            path="/verification" 
            element={<RequireUser><VerificationPage /></RequireUser>} 
          />
          <Route 
            path="/help" 
            element={<HelpPage />} 
          />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/modern-slavery" element={<ModernSlaveryPage />} />
          <Route path="/law-enforcement" element={<LawEnforcementPage />} />
          <Route path="/online-safety" element={<OnlineSafetyPage />} />

          {/* ADMIN PROTECTED ROUTES - Uses regular /login for authentication */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <ErrorBoundary>
                  <AdminLayout />
                </ErrorBoundary>
              </RequireAdmin>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="ads" element={<AdminAdsPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="revenue" element={<AdminRevenuePage />} />
            <Route path="moderation" element={<AdminModerationPage />} />
            <Route path="network" element={<AdminNetworkPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />

            {/* CATCH-ALL FOR BAD ADMIN ROUTES */}
            <Route
              path="*"
              element={<Navigate to="/admin/dashboard" replace />}
            />
          </Route>

          {/* 404 CATCH-ALL ROUTE */}
          <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </main>
              </ToastProviderGlobal>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
    </BrowserRouter>
  );
}
