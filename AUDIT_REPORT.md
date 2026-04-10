# Comprehensive Full-Stack Audit Report

**Application:** ReachRipple (React + Express)  
**Date:** Audit Report  
**Scope:** All API files, backend routes, controllers, frontend pages, state management, navigation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)  
2. [Bug Registry (All Bugs by Severity)](#2-bug-registry)  
3. [API Integration Audit](#3-api-integration-audit)  
4. [Key User Flow Analysis](#4-key-user-flow-analysis)  
5. [Broken Links & Navigation](#5-broken-links--navigation)  
6. [Missing Backend Endpoints](#6-missing-backend-endpoints)  
7. [State Management Issues](#7-state-management-issues)  
8. [Non-Functional Features](#8-non-functional-features)  
9. [Dead Code & Unused Endpoints](#9-dead-code--unused-endpoints)  
10. [Prioritized Fix List](#10-prioritized-fix-list)  

---

## 1. Executive Summary

The application is a classified ad platform with user ad management, admin moderation, chat messaging, credit/invoice system, and a boost/tier system. The codebase is extensive (~50+ files audited). While the backend route structure is comprehensive and well-organized, several critical integration issues prevent features from working correctly in production.

**Key Findings:**
- **3 P0 (Critical)** bugs that break core functionality
- **5 P1 (Major)** bugs that significantly impair features
- **6 P2 (Moderate)** issues affecting secondary features
- **4 P3 (Minor)** issues affecting polish/UX
- **1 entirely non-functional page** (Contact)
- **1 dead backend API** (/api/search) that nothing uses
- **No real-time chat** — Socket.io is configured on backend but frontend uses HTTP polling only
- **No review/rating system UI** — Backend routes exist but no frontend integration
- **No ID verification UI** — Backend routes exist but no frontend page/form to submit verification

---

## 2. Bug Registry

### P0 — Critical (Blocks core functionality)

---

#### BUG-001: EditAdPage delete uses admin-only endpoint
- **File:** `frontend/src/pages/EditAdPage_Luxury.jsx` line 382
- **Description:** The `confirmDelete` function calls `api.delete(`/ads/${id}`)` which routes to the **admin-only** DELETE endpoint (`router.delete("/:id", auth, admin, deleteAd)` in `backend/routes/adRoutes.ts` line 445). Regular users will receive a 401/403 error. The correct user-scoped endpoint is `/ads/${id}/user`.
- **Impact:** Users cannot delete their own ads from the edit page. The delete button appears to work (confirmation dialog shows) but the API call fails silently or shows a generic error.
- **Severity:** P0
- **Fix:** Change line 382 from `await api.delete(`/ads/${id}`)` to `await api.delete(`/ads/${id}/user}`)`. Note: `MyAdsPage.jsx` line 117 correctly uses `/ads/${adId}/user` — so this is an inconsistency.

---

#### BUG-002: Contact form is entirely fake — no API call
- **File:** `frontend/src/pages/ContactPage.jsx` lines 19-26
- **Description:** The `handleSubmit` function uses a `setTimeout` to simulate an API call. No actual HTTP request is made. The form data (`name`, `email`, `subject`, `message`) is collected but discarded. There is no `/api/contact` endpoint anywhere in the backend.
- **Impact:** All contact form submissions are lost. Users see a success message but their inquiry goes nowhere.
- **Severity:** P0
- **Fix:** 
  1. Create `backend/routes/contactRoutes.ts` with a POST handler that sends an email (via nodemailer or similar) or stores in DB
  2. Mount it in `backend/index.ts` as `app.use("/api/contact", contactRoutes)`
  3. Update `ContactPage.jsx` to call `api.post('/contact', formData)` instead of using setTimeout

---

#### BUG-003: AdminLoginPage uses regular user login endpoint
- **File:** `frontend/src/pages/AdminLoginPage.tsx` line 2, 16
- **Description:** The admin login page imports `login` from `../api/auth` which hits `POST /api/auth/login` (the regular user login endpoint). The backend has a separate admin auth system at `POST /api/admin/auth/login` (file: `backend/src/routes/adminAuth.ts`) with its own controller (`adminAuthController.ts`), rate limiter (10 attempts/15min), and potentially different JWT handling. The frontend bypasses all of this and relies on a client-side role check (`user.role !== "admin"`) after using the regular login.
- **Impact:** Admin login bypasses the dedicated admin auth flow (separate rate limiting, potentially separate JWT secrets/tokens, admin-specific audit logging). Security implications — the admin-specific protections are entirely unused.
- **Severity:** P0
- **Fix:** 
  1. Create an `adminLogin` function in `frontend/src/api/auth.ts` (or a new `adminAuth.ts`) that calls `POST /api/admin/auth/login`
  2. Update `AdminLoginPage.tsx` to use the new function
  3. Handle the admin JWT token appropriately (the adminAuth system may use a different token/secret)

---

### P1 — Major (Significant feature impairment)

---

#### BUG-004: Chat has no real-time messaging — Socket.io unused by frontend
- **File:** `backend/config/socket.ts` (full setup), `frontend/src/pages/ChatPage.jsx` (no socket references)
- **Description:** The backend fully implements Socket.io with:
  - JWT authentication middleware
  - Online user tracking
  - Conversation rooms (join/leave)
  - Real-time `message:send` / `message:receive` events
  - Typing indicators (`user:typing`)
  - Read receipts
  - Notifications (`notification:new-message`)
  
  However, the frontend `ChatPage.jsx` makes **zero socket.io connections**. There is no `socket.io-client` import anywhere in the entire frontend codebase. Chat works only through HTTP API calls (fetch conversations, fetch messages), meaning:
  - Users must manually refresh to see new messages
  - No typing indicators
  - No online/offline status
  - No real-time notifications
- **Impact:** Chat feels broken/laggy. Users send a message and the recipient won't see it until they navigate away and back, or manually refresh.
- **Severity:** P1
- **Fix:** Install `socket.io-client` in frontend, create a `SocketContext` or `useSocket` hook, connect on auth, and integrate socket events into `ChatPage.jsx` for real-time message delivery, typing indicators, and read receipts.

---

#### BUG-005: Forgot Password flow is broken — no page exists
- **File:** `frontend/src/pages/LoginPage.jsx` line 273
- **Description:** The "Forgot password?" button on the login page calls `showInfo('Please contact support to reset your password.')` — it just shows a toast message telling users to contact support. There is no `ForgotPasswordPage` in the app. However, the backend has full forgot-password support:
  - `POST /api/auth/forgot-password` — sends reset email (in `authController.ts`)
  - `POST /api/auth/reset-password` — processes reset with token (in `authController.ts`)
  - `ResetPasswordPage.jsx` exists for the token-based reset step
  
  The missing piece is the **initial step** — a page where users enter their email to receive the reset link.
- **Impact:** Users cannot recover their passwords. They're told to "contact support" despite a fully functional backend flow existing.
- **Severity:** P1
- **Fix:** Create `ForgotPasswordPage.jsx` with an email input form that calls `api.post('/auth/forgot-password', { email })`, add route `/forgot-password` in `App.jsx`, and change LoginPage's "Forgot password?" button to `navigate('/forgot-password')`.

---

#### BUG-006: No ID Verification UI — backend exists but no frontend form
- **File:** `backend/routes/verificationRoutes.ts` (lines 34-100), No corresponding frontend page
- **Description:** The backend has complete ID verification endpoints:
  - `GET /api/verification/status` — check verification status
  - `POST /api/verification/request` — upload ID document (multer, 5MB limit, JPG/PNG/PDF)
  
  The frontend has **no verification page or component**. The `UserDashboardPage.jsx` shows a verification badge if `idVerificationStatus === 'verified'`, but there's no way for users to initiate verification. The `HelpPage.jsx` even mentions "use our automated selfie check tool in your dashboard" — but this tool doesn't exist.
- **Impact:** Users cannot verify their identity. The verification badge system is non-functional from the user's perspective.
- **Severity:** P1
- **Fix:** Create a `VerificationPage.jsx` (or add a verification section to `UserProfilePage.jsx`) with a file upload form that calls `POST /api/verification/request` with a `FormData` containing the `idDocument` field.

---

#### BUG-007: No Review/Rating system UI — backend exists but no frontend integration
- **File:** `backend/routes/reviewRoutes.ts` (lines 8-91), No frontend API or components
- **Description:** The backend has complete review CRUD:
  - `GET /api/reviews/ad/:adId` — get reviews for an ad
  - `POST /api/reviews` — create a review (auth required)
  - `PUT /api/reviews/:id` — update a review
  - `DELETE /api/reviews/:id` — delete a review
  
  The frontend has **zero references** to review API endpoints. The `EscortProfilePage_Cinematic.jsx` shows no review section, no star ratings, no "Write a Review" button. There is no `reviews` API file in `frontend/src/api/`.
- **Impact:** The entire review system is invisible to users despite being fully implemented on the backend.
- **Severity:** P1
- **Fix:** Create `frontend/src/api/reviews.ts`, add a Reviews section to `EscortProfilePage_Cinematic.jsx` that fetches and displays reviews, and add a "Write Review" form for authenticated users.

---

#### BUG-008: Homepage doesn't use tiered boost system
- **File:** `frontend/src/pages/EscortsHomePage.jsx` lines 95-108
- **Description:** The backend has a dedicated tiered home endpoint:
  - `GET /api/home` returns ads organized by tier (VIP, Featured, Standard) with proper boost ordering
  - `GET /api/home/vip`, `/home/featured`, `/home/feed` return tier-specific listings
  
  The frontend's `EscortsHomePage.jsx` ignores these entirely. Instead it:
  1. Calls `getAds({ status: "approved", limit: 40 })` — the generic ads endpoint
  2. Uses `buildHomeLists()` client-side utility to sort ads into VIP/Popular tiers
  
  The `boost.ts` API file defines `getHomeData()`, `getVIPListings()`, `getFeaturedListings()`, `getFeedListings()` — but none are imported or called anywhere.
- **Impact:** The boost/tier purchase system is broken from a business perspective. Users who pay for VIP or Featured tiers see no benefit on the homepage because the client-side ranking may not match the server-side tier logic. The entire boost purchase flow exists but the homepage doesn't honor it.
- **Severity:** P1
- **Fix:** Replace the `getAds()` call in `EscortsHomePage.jsx` with `getHomeData()` from `boost.ts` API and use the server-returned tier groupings instead of client-side `buildHomeLists()`.

---

### P2 — Moderate (Secondary feature issues)

---

#### BUG-009: Search page uses /api/ads instead of /api/search
- **File:** `frontend/src/pages/SearchResultsPage.jsx` line 378
- **Description:** `SearchResultsPage` imports `getAds` from `../api/ads` and uses it for all search queries. The backend has a dedicated search endpoint at `GET /api/search` (in `backend/routes/searchRoutes.ts`, 314 lines) with specialized search logic (proximity search, field name mappings like `pricePerHour`, `name` instead of `price`/`title`). The `/api/search` endpoint is mounted in `backend/index.ts` line 184 but is never called by the frontend.
- **Impact:** Search works via the generic ads endpoint, but specialized search features (nearby search, optimized geo queries) are unavailable. The `/api/search` route is dead code.
- **Severity:** P2
- **Fix:** Either (a) migrate `SearchResultsPage` to use `/api/search` endpoint with correct field mappings, or (b) remove `searchRoutes.ts` and consolidate search logic into the ads controller. Option (b) is simpler since the ads controller already handles all the filter params the frontend sends.

---

#### BUG-010: EscortProfilePage saved-profiles DELETE uses wrong ID type
- **File:** `frontend/src/pages/EscortProfilePage_Cinematic.jsx` line 311
- **Description:** The unsave call is `api.delete(`/saved-profiles/${id}`)` where `id` is the **ad ID** from the URL params. The backend route `DELETE /api/saved-profiles/:adId` (in `savedProfileRoutes.ts`) also expects the ad ID, so this actually works correctly. **However**, the `SavedProfilesPage.jsx` may use a different pattern — worth verifying consistency.
- **Note:** After verification, this endpoint mapping is correct. Removing this from the bug list — it's a false positive.
- **Severity:** N/A (Not a bug)

---

#### BUG-010 (Revised): SearchResultsPage location-resolve uses fetch() instead of axios
- **File:** `frontend/src/pages/SearchResultsPage.jsx` line 251
- **Description:** The postcode resolution call uses raw `fetch()` API: `fetch(`/api/location/location-resolve?postcode=...`)` instead of the configured axios instance (`api` from `client.ts`). This bypasses:
  - The axios interceptor that adds the auth token
  - The base URL configuration (relies on proxy/same-origin instead)
  - The token refresh logic
  - Error handling interceptors
  
  The same issue exists in `SearchCardVivaStreet.jsx` line 338.
- **Impact:** In production with separate frontend/backend origins, this fetch call will fail because it doesn't include the correct base URL. Only works in development with CRA proxy configured.
- **Severity:** P2
- **Fix:** Replace `fetch(`/api/location/location-resolve?...`)` with `api.get('/location/location-resolve', { params: { postcode } })`.

---

#### BUG-011: No search history integration
- **File:** `backend/routes/searchHistoryRoutes.ts` exists, No frontend API calls
- **Description:** The backend has `searchHistoryRoutes` mounted at `/api/search-history` (in `index.ts` line 175), but the frontend has no API file or component that reads/writes search history. The `SearchResultsPage` doesn't save searches, and there's no "Recent Searches" feature visible anywhere.
- **Impact:** Search history backend feature is unused/invisible.
- **Severity:** P2
- **Fix:** Create `frontend/src/api/searchHistory.ts`, add search history save calls to `SearchResultsPage`, and optionally show recent searches in the search UI.

---

#### BUG-012: Ad status transition from "hidden" → "pending" triggers re-review
- **File:** `frontend/src/pages/MyAdsPage.jsx` line 89, `backend/routes/adRoutes.ts` line 132-153
- **Description:** When a user un-hides an ad, `MyAdsPage` sends `PATCH /ads/:id/status` with `{ status: "pending" }`. The backend allows status changes to `["hidden", "pending", "draft"]`. Setting status to "pending" means the ad goes back into the admin approval queue — the user loses their "approved" status and must wait for re-approval just to unhide their ad.
- **Impact:** Users who temporarily hide their ad cannot simply make it visible again. They must go through the full approval process again.
- **Severity:** P2
- **Fix:** Add "approved" to the allowed statuses in the backend PATCH handler (with a guard that only allows `hidden → approved` if the ad was previously approved), or add a separate `/ads/:id/unhide` endpoint that restores the previous status.

---

#### BUG-013: CreateAdPage doesn't navigate to the created ad after success
- **File:** `frontend/src/pages/CreateAdPage_Luxury.jsx`
- **Description:** After successful ad creation, the page shows a success toast but the navigation behavior depends on the response. If the ad requires approval (`status: "pending"`), the user may not know where to find it.
- **Impact:** Minor UX issue — users may not know their ad was created successfully or where to manage it.
- **Severity:** P2
- **Fix:** Navigate to `/my-ads` after successful creation with a query param indicating success.

---

#### BUG-014: Admin route authentication inconsistency
- **File:** `frontend/src/api/admin.ts` lines 211-221 (getSettings/updateSettings)
- **Description:** `getSettings()` calls `/settings` (not `/admin/settings`). This works because `settingRoutes.ts` is mounted at `/api/settings` with `auth + admin` middleware. However, it's inconsistent with all other admin API calls that use the `/admin/` prefix. If middleware changes upstream, this could break.
- **Impact:** Low — currently functional but architecturally inconsistent and fragile.
- **Severity:** P2
- **Fix:** Either move settings routes under `/api/admin/settings` for consistency, or document the exception clearly.

---

### P3 — Minor (Polish/UX issues)

---

#### BUG-015: ChatPage has no auto-refresh / polling for new messages
- **File:** `frontend/src/pages/ChatPage.jsx` lines 128-145
- **Description:** Even without Socket.io, the chat page doesn't implement any polling mechanism. Messages are fetched once when a conversation is selected (`useEffect` on `activeConversation._id` change) but never refreshed. There is no `setInterval` for periodic polling.
- **Impact:** Users in an active conversation won't see new messages until they switch away and back.
- **Severity:** P3 (secondary to BUG-004; if Socket.io is implemented, this becomes moot)
- **Fix:** As a stopgap before Socket.io integration, add a `setInterval` every 5-10 seconds to call `chatAPI.getMessages(activeConversation._id)` when a conversation is active.

---

#### BUG-016: AdDetailsPage.tsx is redundant with EscortProfilePage_Cinematic.jsx
- **File:** `frontend/src/pages/AdDetailsPage.tsx` (route: `/ads/:id`), `frontend/src/pages/EscortProfilePage_Cinematic.jsx` (route: `/profile/:id`)
- **Description:** Two different pages display the same ad data with different UIs. Both fetch from `GET /api/ads/:id`. `AdDetailsPage` is simpler, `EscortProfilePage` is the rich cinematic version. Having two routes for the same content creates SEO issues and user confusion.
- **Impact:** Dual content, potential for inconsistent behavior between the two views.
- **Severity:** P3
- **Fix:** Consolidate to one ad detail route/page, or make `AdDetailsPage` redirect to `/profile/:id`.

---

#### BUG-017: No logout from AuthContext clears admin session properly
- **File:** `frontend/src/context/AuthContext.tsx`
- **Description:** The `logout` function in AuthContext calls `POST /api/auth/logout` (the regular user logout). Since the admin login (BUG-003) also uses the regular login, this works incidentally. However, the backend has a separate `POST /api/admin/auth/logout` endpoint that should be called for admin logouts (may handle different token cleanup).
- **Impact:** Admin sessions may not be properly invalidated on the backend's admin auth system.
- **Severity:** P3 (ties to BUG-003)
- **Fix:** After fixing BUG-003, ensure admin logout calls the admin-specific logout endpoint.

---

#### BUG-018: Multiple toast system implementations
- **File:** `frontend/src/pages/EditAdPage_Luxury.jsx` lines 393-398
- **Description:** `EditAdPage_Luxury` imports `useToastContext` (which provides `showSuccess` and `showError`) but then defines its own local `showToast` wrapper function that routes to those same methods. This creates confusion about which toast method to use and leads to inconsistent toast styling.
- **Impact:** Minor code quality issue; toast behavior is consistent but code is duplicated.
- **Severity:** P3
- **Fix:** Remove the local `showToast` wrapper and use `showSuccess`/`showError` directly throughout the component.

---

## 3. API Integration Audit

### Frontend API → Backend Route Mapping

| Frontend API File | API Function | HTTP Call | Backend Route | Status |
|---|---|---|---|---|
| `auth.ts` | `register()` | POST `/auth/register` | `authRoutes.ts` | ✅ OK |
| `auth.ts` | `login()` | POST `/auth/login` | `authRoutes.ts` | ✅ OK |
| `auth.ts` | `getMe()` | GET `/auth/me` | `authRoutes.ts` | ✅ OK |
| `auth.ts` | `logout()` | POST `/auth/logout` | `authRoutes.ts` | ✅ OK |
| `ads.ts` | `getAds()` | GET `/ads` | `adRoutes.ts` → `getAds` controller | ✅ OK |
| `ads.ts` | `getAd()` | GET `/ads/:id` | `adRoutes.ts` → `getAdById` controller | ✅ OK |
| `ads.ts` | `getMyAds()` | GET `/ads/my` | `adRoutes.ts` → `getMyAds` controller | ✅ OK |
| `ads.ts` | `createAd()` | POST `/ads` | `adRoutes.ts` (with multer) | ✅ OK |
| `ads.ts` | `updateMyAd()` | PUT `/ads/:id/user` | `adRoutes.ts` | ✅ OK |
| `ads.ts` | `deleteMyAd()` | DELETE `/ads/:id/user` | `adRoutes.ts` | ✅ OK |
| `ads.ts` | `updateAd()` | PUT `/ads/:id` | `adRoutes.ts` (admin) | ✅ OK |
| `ads.ts` | `approveAd()` | PUT `/ads/:id/approve` | `adRoutes.ts` (admin) | ✅ OK |
| `ads.ts` | `rejectAd()` | PUT `/ads/:id/reject` | `adRoutes.ts` (admin) | ✅ OK |
| `ads.ts` | `deleteAd()` | DELETE `/ads/:id` | `adRoutes.ts` (admin) | ✅ OK |
| `chat.ts` | `getConversations()` | GET `/chat/conversations` | `chatRoutes.ts` | ✅ OK |
| `chat.ts` | `getOrCreateConversation()` | POST `/chat/conversations/:recipientId` | `chatRoutes.ts` | ✅ OK |
| `chat.ts` | `getMessages()` | GET `/chat/conversations/:id/messages` | `chatRoutes.ts` | ✅ OK |
| `chat.ts` | `sendMessage()` | POST `/chat/conversations/:id/messages` | `chatRoutes.ts` | ✅ OK |
| `chat.ts` | `markAsRead()` | PUT `/chat/conversations/:id/read` | `chatRoutes.ts` | ✅ OK |
| `chat.ts` | `getUnreadCount()` | GET `/chat/unread-count` | `chatRoutes.ts` | ✅ OK |
| `credits.ts` | `getCreditPackages()` | GET `/credits/packages` | `creditRoutes.ts` | ✅ OK |
| `credits.ts` | `getCreditBalance()` | GET `/credits/balance` | `creditRoutes.ts` | ✅ OK |
| `credits.ts` | `getCreditTransactions()` | GET `/credits/transactions` | `creditRoutes.ts` | ✅ OK |
| `credits.ts` | `createInvoice()` | POST `/credits/invoice` | `creditRoutes.ts` | ✅ OK |
| `credits.ts` | `getInvoices()` | GET `/credits/invoices` | `creditRoutes.ts` | ✅ OK |
| `credits.ts` | `getInvoice()` | GET `/credits/invoices/:id` | `creditRoutes.ts` | ✅ OK |
| `notifications.ts` | `getMy()` | GET `/notifications/my` | `notificationRoutes.ts` | ✅ OK |
| `notifications.ts` | `getUnreadCount()` | GET `/notifications/unread-count` | `notificationRoutes.ts` | ✅ OK |
| `notifications.ts` | `markAsRead()` | PATCH `/notifications/:id/read` | `notificationRoutes.ts` | ✅ OK |
| `notifications.ts` | `markAllAsRead()` | PATCH `/notifications/mark-all-read` | `notificationRoutes.ts` | ✅ OK |
| `boost.ts` | `getBoostPricing()` | GET `/boost/pricing` | `boostRoutes.ts` | ✅ OK |
| `boost.ts` | `purchaseBoost()` | POST `/boost/purchase` | `boostRoutes.ts` | ✅ OK |
| `boost.ts` | `getMyBoosts()` | GET `/boost/my-boosts` | `boostRoutes.ts` | ✅ OK |
| `boost.ts` | `getBoostStatus()` | GET `/boost/status/:adId` | `boostRoutes.ts` | ✅ OK |
| `boost.ts` | `getHomeData()` | GET `/home` | `homeRoutes.ts` | ⚠️ Exists but NEVER CALLED |
| `boost.ts` | `getVIPListings()` | GET `/home/vip` | `homeRoutes.ts` | ⚠️ Exists but NEVER CALLED |
| `boost.ts` | `getFeaturedListings()` | GET `/home/featured` | `homeRoutes.ts` | ⚠️ Exists but NEVER CALLED |
| `boost.ts` | `getFeedListings()` | GET `/home/feed` | `homeRoutes.ts` | ⚠️ Exists but NEVER CALLED |
| `admin.ts` | `getAdminStats()` | GET `/admin/stats` | `adminStats.ts` | ✅ OK |
| `admin.ts` | `getAdminAds()` | GET `/admin/ads` | `adminAds.ts` | ✅ OK |
| `admin.ts` | `updateAdStatus()` | PATCH `/admin/ads/:id/status` | `adminAds.ts` | ✅ OK |
| `admin.ts` | `deleteAdminAd()` | DELETE `/admin/ads/:id` | `adminAds.ts` | ✅ OK |
| `admin.ts` | `getAdminUsers()` | GET `/admin/users` | `adminUsers.ts` | ✅ OK |
| `admin.ts` | `updateUserStatus()` | PATCH `/admin/users/:id/status` | `adminUsers.ts` | ✅ OK |
| `admin.ts` | `deleteUser()` | DELETE `/admin/users/:id` | `adminUsers.ts` | ✅ OK |
| `admin.ts` | `getAdminReports()` | GET `/admin/reports` | `adminReports.ts` | ✅ OK |
| `admin.ts` | `resolveReport()` | PATCH `/admin/reports/:id/resolve` | `adminReports.ts` | ✅ OK |
| `admin.ts` | `getSettings()` | GET `/settings` | `settingRoutes.ts` | ⚠️ Works but inconsistent path |
| `admin.ts` | `updateSettings()` | POST `/settings` | `settingRoutes.ts` | ⚠️ Works but inconsistent path |
| `admin.ts` | `getPricingSettings()` | GET `/settings/pricing` | `settingRoutes.ts` | ⚠️ Works but inconsistent path |
| `admin.ts` | `updatePricingSettings()` | POST `/settings/pricing` | `settingRoutes.ts` | ⚠️ Works but inconsistent path |
| `admin.ts` | `getAnalytics()` | GET `/admin/analytics` | `adminAnalytics.ts` | ✅ OK |
| `admin.ts` | `getModerationQueue()` | GET `/admin/moderation/queue` | `adminModeration.ts` | ✅ OK |
| `admin.ts` | `moderateAd()` | PATCH `/admin/moderation/:id/moderate` | `adminModeration.ts` | ✅ OK |
| `admin.ts` | `getRiskUsers()` | GET `/admin/moderation/risk-users` | `adminModeration.ts` | ✅ OK |
| `admin.ts` | `getModerationStats()` | GET `/admin/moderation/stats` | `adminModeration.ts` | ✅ OK |
| `admin.ts` | `triggerPatternScan()` | POST `/admin/moderation/scan` | `adminModeration.ts` | ✅ OK |
| `admin.ts` | `recalculateUserRisk()` | POST `/admin/moderation/recalculate-risk/:id` | `adminModeration.ts` | ✅ OK |

### Direct Page API Calls (not through API files)

| Page | API Call | Backend Route | Status |
|---|---|---|---|
| `EditAdPage_Luxury.jsx:382` | `api.delete(`/ads/${id}`)` | Admin-only route | ❌ **BUG-001** |
| `UserDashboardPage.jsx:32` | `api.get("/auth/me")` | `authRoutes.ts` | ✅ OK |
| `UserDashboardPage.jsx:36` | `api.get("/ads/my")` | `adRoutes.ts` | ✅ OK |
| `UserDashboardPage.jsx:41` | `api.get("/ads/posting-limits")` | `adRoutes.ts` | ✅ OK |
| `UserProfilePage.jsx:93` | `client.put("/auth/password", ...)` | `authRoutes.ts` | ✅ OK |
| `UserProfilePage.jsx:127` | `client.delete("/auth/account", ...)` | `authRoutes.ts` | ✅ OK |
| `MyAdsPage.jsx:89` | `api.patch(`/ads/${adId}/status`, ...)` | `adRoutes.ts` | ✅ OK |
| `MyAdsPage.jsx:117` | `api.delete(`/ads/${adId}/user`)` | `adRoutes.ts` | ✅ OK |
| `EscortProfilePage:116` | `api.get(`/ads/${id}`)` | `adRoutes.ts` | ✅ OK |
| `EscortProfilePage:131` | `api.get('/saved-profiles')` | `savedProfileRoutes.ts` | ✅ OK |
| `EscortProfilePage:311` | `api.delete(`/saved-profiles/${id}`)` | `savedProfileRoutes.ts` | ✅ OK |
| `EscortProfilePage:315` | `api.post('/saved-profiles', { adId })` | `savedProfileRoutes.ts` | ✅ OK |
| `SearchResultsPage:251` | `fetch(`/api/location/location-resolve?...`)` | `locationRoutes.ts` | ⚠️ **BUG-010** (uses fetch not axios) |
| `ContactPage.jsx:22` | `setTimeout(...)` | None | ❌ **BUG-002** |

---

## 4. Key User Flow Analysis

### Flow 1: User Registration → Login → Create Profile
- **Registration** (`SignupPage.jsx` → `POST /auth/register`): ✅ Works
- **Email Verification** (`VerifyEmailPage.jsx` → `POST /auth/verify-email`): ✅ Works
- **Login** (`LoginPage.jsx` → `POST /auth/login`): ✅ Works
- **Create Ad** (`CreateAdPage_Luxury.jsx` → `POST /ads`): ✅ Works (with image upload via FormData)
- **Overall:** ✅ Functional

### Flow 2: Search & Browse Ads
- **Homepage** (`EscortsHomePage.jsx`): ⚠️ Works but doesn't use tiered boost system (BUG-008)
- **Search** (`SearchResultsPage.jsx`): ⚠️ Works via `/api/ads` but bypasses `/api/search` (BUG-009)
- **View Profile** (`EscortProfilePage_Cinematic.jsx`): ✅ Works
- **Overall:** ⚠️ Functional but boost tiers are not honored

### Flow 3: Edit / Delete Ad
- **Edit** (`EditAdPage_Luxury.jsx` → `PUT /ads/:id/user`): ✅ Works
- **Delete from Edit Page** (`EditAdPage_Luxury.jsx` → `DELETE /ads/:id`): ❌ **BROKEN** (BUG-001 — uses admin endpoint)
- **Delete from My Ads** (`MyAdsPage.jsx` → `DELETE /ads/:id/user`): ✅ Works
- **Overall:** ❌ Partially broken

### Flow 4: Chat/Messaging
- **Start Conversation** (`ChatPage.jsx` → `POST /chat/conversations/:recipientId`): ✅ Works (one-time)
- **Send Message** (`ChatPage.jsx` → `POST /chat/conversations/:id/messages`): ✅ Works
- **Receive Messages** (real-time): ❌ **BROKEN** (BUG-004 — no Socket.io in frontend)
- **Overall:** ❌ Partially broken (send works, receive requires manual refresh)

### Flow 5: Save Profiles
- **Save** (`EscortProfilePage.jsx` → `POST /saved-profiles`): ✅ Works
- **Unsave** (`EscortProfilePage.jsx` → `DELETE /saved-profiles/:adId`): ✅ Works
- **View Saved** (`SavedProfilesPage.jsx` → `GET /saved-profiles`): ✅ Works (with localStorage fallback on 401)
- **Overall:** ✅ Functional

### Flow 6: Password Recovery
- **Forgot Password** (LoginPage.jsx → toast only): ❌ **BROKEN** (BUG-005)
- **Reset Password** (`ResetPasswordPage.jsx` → `POST /auth/reset-password`): ✅ Works (if user somehow has a token)
- **Overall:** ❌ Broken (no way to get reset token)

### Flow 7: Admin Login → Dashboard → Manage Ads/Users
- **Admin Login** (`AdminLoginPage.tsx` → `POST /auth/login`): ⚠️ Works incidentally (BUG-003 — wrong endpoint)
- **Dashboard** (`AdminDashboardPage.tsx` → `GET /admin/stats`): ✅ Works
- **Manage Ads** (`AdminAdsPage.tsx` → `/admin/ads/*`): ✅ Works
- **Manage Users** (`AdminUsersPage.tsx` → `/admin/users/*`): ✅ Works
- **Reports** (`AdminReportsPage.tsx` → `/admin/reports/*`): ✅ Works
- **Settings** (`AdminSettingsPage.tsx` → `/settings`): ✅ Works (BUG-014 — inconsistent path but functional)
- **Analytics** (`AdminAnalyticsPage.tsx` → `/admin/analytics`): ✅ Works
- **Moderation** (`AdminModerationPage.tsx` → `/admin/moderation/*`): ✅ Works
- **Overall:** ⚠️ Functional but uses wrong auth flow

### Flow 8: Buy Credits / Boost Ads
- **View Packages** (`BuyCreditsPage.tsx` → `GET /credits/packages`): ✅ Works
- **Create Invoice** (`BuyCreditsPage.tsx` → `POST /credits/invoice`): ✅ Works
- **Purchase Boost** (via `boost.ts` → `POST /boost/purchase`): ✅ Backend works, but homepage doesn't use tiers (BUG-008)
- **Overall:** ⚠️ Purchase flow works but boost effect is invisible on homepage

### Flow 9: Contact Support
- **Submit Contact Form** (`ContactPage.jsx` → setTimeout): ❌ **BROKEN** (BUG-002)
- **Overall:** ❌ Completely non-functional

### Flow 10: Account Management
- **View Profile** (`UserProfilePage.jsx` → `GET /auth/me`): ✅ Works
- **Update Profile** (`UserProfilePage.jsx` → `PUT /auth/profile`): ✅ Works
- **Change Password** (`UserProfilePage.jsx` → `PUT /auth/password`): ✅ Works
- **Delete Account** (`UserProfilePage.jsx` → `DELETE /auth/account`): ✅ Works
- **ID Verification**: ❌ **BROKEN** (BUG-006 — no UI exists)
- **Overall:** ⚠️ Mostly functional except verification

---

## 5. Broken Links & Navigation

| Source | Link/Navigation | Target | Status |
|---|---|---|---|
| `LoginPage.jsx` line 273 | "Forgot password?" button | Toast message only | ❌ Should navigate to a forgot-password page |
| `App.jsx` | `/chat` and `/chat/:conversationId` | `ChatPage` | ✅ OK |
| `App.jsx` | `/search` legacy route | Redirects to `/escort/gb` | ✅ OK |
| `App.jsx` | `/escorts/:location` | Redirects to `/escort/:location` | ✅ OK |
| `App.jsx` | `/admin/login` | `AdminLoginPage` | ✅ OK (but uses wrong auth - BUG-003) |
| `App.jsx` | `/verify-email` | `VerifyEmailPage` | ✅ OK |
| `App.jsx` | `/reset-password` | `ResetPasswordPage` | ✅ OK |
| `App.jsx` | No `/forgot-password` route | N/A | ❌ Missing route (BUG-005) |
| All pages | `RequireUser` guard | Redirects admin to `/admin/dashboard` | ✅ OK |
| All pages | `RequireAdmin` guard | Redirects non-admin to `/` | ✅ OK |
| `App.jsx` | `/profile/:id` and `/ads/:id` | Two different pages for same data | ⚠️ BUG-016 |

---

## 6. Missing Backend Endpoints

| Missing Endpoint | Needed By | Priority |
|---|---|---|
| `POST /api/contact` | `ContactPage.jsx` — contact form submissions | P0 |
| `GET /api/ads/:id/reviews` (or use existing `/api/reviews/ad/:adId`) | `EscortProfilePage_Cinematic.jsx` — display reviews | P1 |
| No endpoint missing, but `POST /api/verification/request` has no frontend UI | `UserProfilePage.jsx` or new `VerificationPage.jsx` | P1 |

**Note:** Most backend endpoints exist and are well-implemented. The primary gaps are in the frontend integration, not missing backend routes.

---

## 7. State Management Issues

### AuthContext (`frontend/src/context/AuthContext.tsx`)
- **Session Check Interval:** Calls `getMe()` every 5 minutes to verify session. ✅ Working
- **Token Storage:** Uses both `localStorage` and in-memory tokens (in `client.ts`). ✅ Working
- **Token Refresh:** Axios interceptor catches 401, calls `POST /auth/refresh-token` with HttpOnly cookie. ✅ Working
- **Admin State:** `isAdmin` is derived from `user?.role === "admin"`. Works but relies on client-side role check rather than backend-enforced admin tokens.
- **Issue:** No separate admin auth state. Admin and regular user share the same auth context which means:
  - An admin can access regular user pages (blocked only by `RequireUser` redirect)
  - Logging out as admin uses the user logout endpoint

### ToastContextGlobal (`frontend/src/context/ToastContextGlobal.jsx`)
- Provides `showSuccess`, `showError`, `showInfo` methods. ✅ Working
- **Issue:** Some pages use these directly, others create local wrappers or use different toast patterns (BUG-018)

### ThemeContext (`frontend/src/context/ThemeContext.jsx`)
- Dark/light mode toggle with `localStorage` persistence. ✅ Working

---

## 8. Non-Functional Features

| Feature | Backend Status | Frontend Status | Issue |
|---|---|---|---|
| **Contact Form** | ❌ No endpoint | ❌ Fake (setTimeout) | BUG-002 |
| **Real-time Chat** | ✅ Socket.io fully configured | ❌ Not integrated | BUG-004 |
| **Forgot Password** | ✅ Endpoint exists | ❌ No page/form | BUG-005 |
| **ID Verification** | ✅ Upload + status endpoints | ❌ No UI | BUG-006 |
| **Reviews/Ratings** | ✅ Full CRUD routes | ❌ No UI or API file | BUG-007 |
| **Tiered Homepage** | ✅ /api/home with tiers | ❌ Uses /api/ads instead | BUG-008 |
| **Search History** | ✅ Routes exist | ❌ No frontend integration | BUG-011 |
| **Nearby Search** | ✅ /api/search/nearby route | ❌ Not used by frontend | BUG-009 |

---

## 9. Dead Code & Unused Endpoints

| Code | Location | Reason |
|---|---|---|
| `searchRoutes.ts` (entire file, 314 lines) | `backend/routes/searchRoutes.ts` | Frontend uses `/api/ads` with filter params instead of `/api/search` |
| `getHomeData()` | `frontend/src/api/boost.ts` | Never imported or called by any page |
| `getVIPListings()` | `frontend/src/api/boost.ts` | Never imported or called by any page |
| `getFeaturedListings()` | `frontend/src/api/boost.ts` | Never imported or called by any page |
| `getFeedListings()` | `frontend/src/api/boost.ts` | Never imported or called by any page |
| `searchHistoryRoutes.ts` | `backend/routes/searchHistoryRoutes.ts` | No frontend calls to `/api/search-history` |
| `POST /api/admin/auth/login` | `backend/src/routes/adminAuth.ts` | AdminLoginPage uses `/api/auth/login` instead |
| `POST /api/admin/auth/refresh` | `backend/src/routes/adminAuth.ts` | No frontend calls this |
| `POST /api/admin/auth/logout` | `backend/src/routes/adminAuth.ts` | No frontend calls this |
| `reviewRoutes.ts` (entire file) | `backend/routes/reviewRoutes.ts` | No frontend integration |

---

## 10. Prioritized Fix List

### P0 — Fix Immediately (3 issues)

| # | Bug | Est. Effort | Fix Summary |
|---|---|---|---|
| 1 | BUG-001: EditAdPage delete endpoint | 5 min | Change `/ads/${id}` to `/ads/${id}/user` on line 382 |
| 2 | BUG-002: Contact form is fake | 2-4 hrs | Create backend contact route + email sending + update frontend |
| 3 | BUG-003: Admin login uses wrong endpoint | 1 hr | Create admin-specific login API call + update AdminLoginPage |

### P1 — Fix This Sprint (5 issues)

| # | Bug | Est. Effort | Fix Summary |
|---|---|---|---|
| 4 | BUG-004: No real-time chat | 4-8 hrs | Integrate socket.io-client into frontend ChatPage |
| 5 | BUG-005: No forgot password page | 2-3 hrs | Create ForgotPasswordPage + route + API call |
| 6 | BUG-006: No verification UI | 3-4 hrs | Create verification form in UserProfilePage or new page |
| 7 | BUG-007: No review system UI | 4-6 hrs | Create reviews API file + add reviews section to profile page |
| 8 | BUG-008: Homepage ignores boost tiers | 2-3 hrs | Switch EscortsHomePage to use getHomeData() API |

### P2 — Fix Next Sprint (6 issues)

| # | Bug | Est. Effort | Fix Summary |
|---|---|---|---|
| 9 | BUG-009: Unused search endpoint | 2 hrs | Evaluate + consolidate or migrate |
| 10 | BUG-010: fetch() instead of axios | 30 min | Replace with api.get() calls |
| 11 | BUG-011: No search history | 3-4 hrs | Create frontend API + integrate into search UI |
| 12 | BUG-012: Hidden→Pending re-review | 1 hr | Allow hidden→approved transition in backend |
| 13 | BUG-013: No post-creation navigation | 30 min | Add navigate('/my-ads') after successful creation |
| 14 | BUG-014: Settings path inconsistency | 1 hr | Move settings under /admin/settings |

### P3 — Backlog (4 issues)

| # | Bug | Est. Effort | Fix Summary |
|---|---|---|---|
| 15 | BUG-015: No chat polling | 1 hr | Add setInterval polling (stopgap) |
| 16 | BUG-016: Dual ad detail pages | 1 hr | Consolidate or redirect |
| 17 | BUG-017: Admin logout endpoint | 30 min | Call admin-specific logout after BUG-003 fix |
| 18 | BUG-018: Toast wrapper duplication | 30 min | Remove local showToast, use context methods |

---

## Summary Statistics

| Category | Count |
|---|---|
| Total bugs found | 18 |
| P0 (Critical) | 3 |
| P1 (Major) | 5 |
| P2 (Moderate) | 6 |
| P3 (Minor) | 4 |
| API endpoints verified | 55+ |
| Broken API integrations | 2 (BUG-001, BUG-002) |
| Features with backend but no frontend | 5 (Reviews, Verification, Real-time chat, Search History, Tiered Homepage) |
| Dead code files/functions | 10+ |
| Estimated total fix effort | ~30-45 developer hours |

---

*End of Audit Report*
