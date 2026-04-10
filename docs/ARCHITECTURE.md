# Architecture

## System Overview

```
┌──────────────────────────────┐
│  React SPA  (port 3000)      │
│  Tailwind CSS + React Router │
└──────────┬───────────────────┘
           │  Axios / Socket.IO
           ▼
┌──────────────────────────────┐
│  Express API  (port 3001)    │
│  TypeScript + JWT auth       │
│  23 public + 6 admin routes  │
└──────┬───────────┬───────────┘
       │           │
       ▼           ▼
┌────────────┐ ┌────────┐
│  MongoDB   │ │  Redis  │
│  (27017)   │ │ (6379)  │
└────────────┘ └────────┘
```

Docker Compose runs all four services on a single `reachripple-network` bridge.

---

## Backend

### Entry Point

`backend/index.ts` — configures Express middleware, mounts all routes, starts the HTTP server and Socket.IO, then kicks off scheduled services (bump operations every 5 min, expiry notifications every hour, tap-up scheduler every 5 s).

### Middleware Stack (applied in order)

| Middleware | Purpose |
|-----------|---------|
| `expressLogger` | Log every request (Pino) |
| `requestTimingMiddleware` | Track slow queries (>300 ms → Redis) |
| `helmet()` | Security headers (CSP, HSTS, CORP) |
| `cors(corsOptions)` | Credentials + configurable origin |
| `express.json({ limit: "10mb" })` | Body parser |
| `express.urlencoded(…)` | Form parser |
| `cookieParser()` | Cookie parsing |
| `apiLimiter` on `/api` | 1 000 req / 15 min global rate limit |

### Route Mounts

#### Public API

| Path | Router | Rate Limiter |
|------|--------|-------------|
| `/health` | `healthRoutes` | — |
| `/api/auth` | `authRoutes` | `authRateLimiter` on login/register/forgot/reset |
| `/api/ai` | `aiRoutes` | — |
| `/api/ads` | `adRoutes` | `adsRateLimiter` |
| `/api/users` | `userRoutes` | — |
| `/api/reports` | `reportRoutes` | — |
| `/api/settings` | `settingRoutes` | — |
| `/api/notifications` | `notificationRoutes` | — |
| `/api/saved-profiles` | `savedProfileRoutes` | — |
| `/api/search-history` | `searchHistoryRoutes` | — |
| `/api/reviews` | `reviewRoutes` | — |
| `/api/chat` | `chatRoutes` | — |
| `/api/location` | `locationRoutes` | `locationRateLimiter` |
| `/api/home` | `homeRoutes` | — |
| `/api/boost` | `boostRoutes` | — |
| `/api/credits` | `creditRoutes` | — |
| `/api` | `searchRoutes` | `searchRateLimiter` |

#### Admin API (all behind `auth` + `adminCheck`)

| Path | Router |
|------|--------|
| `/api/admin/auth` | `adminAuth` (public — login only) |
| `/api/admin/stats` | `adminStats` |
| `/api/admin/ads` | `adminAds` |
| `/api/admin/users` | `adminUsers` |
| `/api/admin/reports` | `adminReports` |
| `/api/admin/revenue` | `adminRevenue` |

### Middleware Files

| File | Purpose |
|------|---------|
| `middleware/auth.ts` | Verify JWT Bearer token → sets `req.userId` |
| `middleware/admin.ts` | Lookup user, check `role === "admin"` → 403 |
| `middleware/validate.ts` | `validateBody(schema)`, `validateQuery(schema)`, `validateParams(schema)` via Zod |

### Controllers

| File | Handles |
|------|---------|
| `adController.ts` | CRUD for ads, status changes, trust-safety scoring on create |
| `authController.ts` | Register, login, refresh, verify email, forgot/reset password |
| `reportController.ts` | Create + list reports |
| `settingController.ts` | Get/update global settings |
| `userController.ts` | Profile get/update, user listing |
| `src/controllers/adminController.ts` | Admin stats, user/ad moderation |

---

## Models (16 Mongoose schemas)

| Model | Collection | Purpose |
|-------|-----------|---------|
| **User** | `users` | Accounts with `role` (user/admin), email verification, agency details, trust scores |
| **Ad** | `ads` | Listings with tier (Spotlight/Prime/Glow/Standard), pricing, GeoJSON, quality scores, videos |
| **Message** | `messages` | Chat messages with read tracking |
| **Conversation** | `conversations` | Chat threads with per-participant unread counts |
| **Notification** | `notifications` | In-app notifications |
| **Report** | `reports` | Ad reports (pending/reviewed/dismissed) |
| **Review** | `reviews` | Star ratings + comments per ad |
| **SavedProfile** | `savedprofiles` | Bookmarked ads |
| **SearchHistory** | `searchhistories` | User search log |
| **Setting** | `settings` | Key-value site config |
| **AdminConfig** | `adminconfigs` | Tier caps, demand multipliers, feature toggles per location |
| **AuditLog** | `auditlogs` | Action audit trail with severity, IP, user-agent |
| **BoostPurchase** | `boostpurchases` | Tier/add-on purchases with expiry tracking |
| **Credit** | `creditwallets` + `credittransactions` | Wallet balance and transaction ledger |
| **DailyRevenue** | `dailyrevenues` | Per-location revenue aggregation |
| **GeoCache** | `geocaches` | Cached postcodes.io lookups (TTL 60 days) |
| **Invoice** | `invoices` | Payment invoices with bank transfer matching |

---

## Services (10)

| Service | Schedule | Purpose |
|---------|----------|---------|
| `bumpService` | Every 5 min | Process tap-up bumps, expire tiers/add-ons, update quality scores |
| `tapUpScheduler` | Every 5 s | Redis ZSET queue for precise auto-bump timing |
| `expiryNotificationService` | Every 1 h | Notify users 48 h / 12 h before tier expiry; demote expired |
| `rankingService` | On query | Deterministic daily rotation, badge computation, tier-based sort |
| `trustSafetyService` | On ad create | Profile completeness (0-100) and risk score (0-100) |
| `abusePreventionService` | On bump | Daily/hourly caps, cooldown checks, IP abuse detection |
| `cacheService` | — | Redis get/set/delete with pattern invalidation |
| `chatService` | — | Conversation CRUD, message sending, unread counts |
| `emailService` | — | Nodemailer transactional emails (verification, reset, welcome) |
| `observabilityService` | — | Redis-backed metrics: searches/min, auth attempts, slow queries |

---

## Frontend

### Context Providers

| Provider | Purpose |
|----------|---------|
| `AuthContext` | JWT auth state, login/logout/register, role checks (`isAdmin`, `isRegularUser`) |
| `ToastContextGlobal` | Single toast system (`showSuccess`, `showError`, `showWarning`, `showInfo`) |
| `SocketContext` | Socket.IO connection for real-time chat |

### Pages (27)

| Page | Route | Auth |
|------|-------|------|
| `MainHomePage` | `/` | Public |
| `EscortsHomePage` | `/escorts` | Public |
| `SearchResultsPage` | `/escort/:location` | Public |
| `EscortProfilePage` | `/profile/:id` | Public |
| `AdDetailsPage` | `/ads/:id` | Public |
| `LoginPage` | `/login` | Public |
| `SignupPage` | `/signup` | Public |
| `HelpPage` | `/help` | Public |
| `SafetyPage` | `/safety` | Public |
| `ContactPage` | `/contact` | Public |
| `TermsPage` | `/terms` | Public |
| `PrivacyPage` | `/privacy` | Public |
| `SavedProfilesPage` | `/saved` | Public |
| `NotFoundPage` | `*` | Public |
| `UserDashboardPage` | `/dashboard` | User |
| `CreateAdPageLuxury` | `/create-ad` | User |
| `EditAdPageLuxury` | `/edit-ad/:id` | User |
| `MyAdsPage` | `/my-ads` | User |
| `UserProfilePage` | `/account` | User |
| `BuyCreditsPage` | `/buy-credits` | User |
| `ChatPage` | `/chat`, `/chat/:conversationId` | Logged in |
| `AdminLoginPage` | `/admin/login` | Public |
| `AdminDashboardPage` | `/admin/dashboard` | Admin |
| `AdminUsersPage` | `/admin/users` | Admin |
| `AdminAdsPage` | `/admin/ads` | Admin |
| `AdminReportsPage` | `/admin/reports` | Admin |
| `AdminSettingsPage` | `/admin/settings` | Admin |

### API Modules (8)

| Module | Key Exports |
|--------|-------------|
| `client.ts` | Axios instance, token helpers, refresh interceptor |
| `auth.ts` | `register`, `login`, `getMe`, `logout` |
| `ads.ts` | Full ad CRUD + admin status updates |
| `admin.ts` | Stats, user/ad/report management, settings |
| `boost.ts` | Pricing + purchase |
| `chat.ts` | Conversations, messages, unread count |
| `credits.ts` | Packages, balance, transactions, invoices |
| `notifications.ts` | List, unread count, mark read |

### Components (~42)

Organised in `components/` with subfolders:

- **Root** — `Navbar`, `Footer`, `AdCard`, `ErrorBoundary`, `ConfirmModal`, `BoostModal`, `NotificationCenter`, `FeaturedProfilesCarousel`, `ImageGallery`, `ScrollToTop`, `ThemeToggle`, `VerificationBadges`, `Alerts`, `AdminSidebar`, `AdminTopbar`, `FilterBottomSheet`, `ProfileQuickViewModal`, `NotificationsBanner`
- **search/** — `HeroSearchBar`, `SearchCardVivaStreet`, `SearchResultCard`, `FilterBar`, `FilterSidebar`, `SortDropdown`, `ActiveFilterChips`, `EmptyState`, `LoadMoreButton`, `SkeletonCard`
- **dashboard/** — `UpsellBanner`
- **ui/** — `LoadingButton`, `Pagination`, `SectionCard`, `SkeletonLoader`, `SkeletonTable`, `SkipLink`, `StatusPill`, `Toast`

---

## Authentication Flow

1. User registers → backend hashes password (bcrypt 12), stores user, sends verification email
2. User logs in → backend verifies credentials, returns `accessToken` (short-lived) + `refreshToken` (7 d)
3. Frontend stores tokens in memory (`client.ts`), attaches `Authorization: Bearer <token>` to every request
4. On 401, Axios interceptor calls `/api/auth/refresh` with refresh token, retries original request
5. Admin users have `role: "admin"` — admin routes check via `adminCheck` middleware
6. Frontend `AuthContext` exposes `isAdmin()` and `isRegularUser()` to conditionally render routes

---

## Boost / Tier System

Ads can be boosted to paid tiers with descending priority:

| Tier | Sort Position | Features |
|------|--------------|----------|
| **Spotlight** | 1st (top) | Maximum visibility, capped per location |
| **Prime** | 2nd | High visibility, capped per location |
| **Glow** | 3rd | Enhanced visibility |
| **Standard** | 4th (default) | Free, base listing |

Add-ons (independent of tier):
- **Tap-Up** — automatic periodic bump (6/8/12 h intervals) via Redis scheduler
- **New Label** — "NEW" badge on listing
- **Website Link** — clickable URL on profile

Purchases are tracked in `BoostPurchase`, paid via credit wallet (`CreditWallet` + `CreditTransaction`), invoiced via `Invoice`.

---

## Data Flow

```
User action (React)
  → Axios request (api/*.ts)
    → Express router (routes/*.ts)
      → validate middleware (Zod)
      → auth middleware (JWT)
      → controller (controllers/*.ts)
        → Mongoose model query
        → service layer (if needed)
      ← JSON response
    ← Axios response
  ← React state update / toast
```

Real-time chat uses Socket.IO alongside the REST API for message delivery and typing indicators.
