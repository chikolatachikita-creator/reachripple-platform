# API Reference

Base URL: `http://localhost:3001` (dev) or as configured.

All authenticated endpoints require `Authorization: Bearer <accessToken>`. Admin endpoints additionally require the user to have `role: "admin"`.

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Server status, uptime, memory, DB/Redis connectivity |
| GET | `/health/flags` | — | Feature flag status |

---

## Auth

Rate-limited: login, register, forgot-password, reset-password.

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/register` | — | `{ name, email, password }` | Create account, send verification email |
| POST | `/api/auth/login` | — | `{ email, password }` | Returns `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh` | — | `{ refreshToken }` | Returns new access + refresh tokens |
| POST | `/api/auth/logout` | JWT | — | Invalidate refresh token |
| GET | `/api/auth/me` | JWT | — | Current user profile |
| GET | `/api/auth/verify-email/:token` | — | — | Verify email address |
| POST | `/api/auth/forgot-password` | — | `{ email }` | Send password reset email |
| POST | `/api/auth/reset-password` | — | `{ token, password }` | Reset password |
| PUT | `/api/auth/change-password` | JWT | `{ currentPassword, newPassword }` | Change password |

---

## Ads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/ads` | — | List ads (query: `page`, `limit`, `status`, `category`, `location`) |
| GET | `/api/ads/:id` | — | Single ad detail |
| POST | `/api/ads` | JWT | Create ad (multipart/form-data for images) |
| PUT | `/api/ads/:id` | JWT | Update own ad |
| DELETE | `/api/ads/:id` | JWT | Delete own ad |
| GET | `/api/ads/my/ads` | JWT | Current user's ads |
| PATCH | `/api/ads/:id/status` | JWT+Admin | Update ad status (`{ status, rejectionReason }`) |

Rate-limited via `adsRateLimiter`.

---

## Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/search` | — | Search ads (query: `q`, `category`, `location`, `outcode`, `distance`, `sort`, `page`, `limit`) |

Rate-limited via `searchRateLimiter`.

---

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/:id` | — | Public user profile |
| PUT | `/api/users/profile` | JWT | Update own profile (`{ name, phone }`) |

---

## Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/chat/conversations` | JWT | List user's conversations |
| POST | `/api/chat/conversations` | JWT | Get or create conversation (`{ recipientId }`) |
| GET | `/api/chat/conversations/:id/messages` | JWT | Messages in conversation (query: `page`, `limit`) |
| POST | `/api/chat/conversations/:id/messages` | JWT | Send message (`{ content }`) |
| PUT | `/api/chat/conversations/:id/read` | JWT | Mark conversation as read |
| GET | `/api/chat/unread-count` | JWT | Total unread message count |

---

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | JWT | List user's notifications |
| GET | `/api/notifications/unread-count` | JWT | Unread count |
| PUT | `/api/notifications/:id/read` | JWT | Mark one as read |
| PUT | `/api/notifications/read-all` | JWT | Mark all as read |

---

## Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reviews/ad/:adId` | — | Reviews for an ad |
| POST | `/api/reviews` | JWT | Create review (`{ adId, rating, title, comment }`) |
| PUT | `/api/reviews/:id` | JWT | Update own review |
| DELETE | `/api/reviews/:id` | JWT | Delete own review |

---

## Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/reports` | JWT | Report an ad (`{ adId, reason }`) |
| GET | `/api/reports` | JWT+Admin | List all reports (query: `status`, `page`, `limit`) |
| PUT | `/api/reports/:id` | JWT+Admin | Update report status |

---

## Saved Profiles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/saved-profiles` | JWT | List user's saved profiles |
| POST | `/api/saved-profiles` | JWT | Save a profile (`{ adId }`) |
| DELETE | `/api/saved-profiles/:adId` | JWT | Remove saved profile |

---

## Search History

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/search-history` | JWT | User's search history |
| DELETE | `/api/search-history` | JWT | Clear search history |

---

## Location

Rate-limited via `locationRateLimiter`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/location/autocomplete` | — | Location autocomplete (query: `q`) |
| GET | `/api/location/postcode/:postcode` | — | Lookup postcode → lat/lng/district |

---

## Boost

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/boost/pricing` | JWT | Get current tier + add-on pricing |
| POST | `/api/boost/purchase` | JWT | Purchase boost (`{ adId, boostType, durationDays, tapUpIntervalHours? }`) |

---

## Credits

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/credits/packages` | JWT | Available credit packages |
| GET | `/api/credits/balance` | JWT | Current wallet balance |
| GET | `/api/credits/transactions` | JWT | Transaction history (query: `page`, `limit`) |
| POST | `/api/credits/invoice` | JWT | Create purchase invoice (`{ packageId, paymentMethod }`) |

---

## Home

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/home` | — | Home page data (featured ads, stats) |

---

## AI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai/suggest` | JWT | AI-powered ad description suggestions |

---

## Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/settings` | JWT+Admin | Get all settings |
| PUT | `/api/settings` | JWT+Admin | Update settings |

---

## Admin

All admin routes (except `/api/admin/auth`) require `Authorization: Bearer <token>` where the token belongs to a user with `role: "admin"`.

### Admin Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/auth/login` | — | Admin login → tokens |

### Admin Stats

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/stats` | Admin | Dashboard stats (users, ads, revenue) |

### Admin Ads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/ads` | Admin | List all ads with filters |
| PATCH | `/api/admin/ads/:id/status` | Admin | Approve/reject/hide ad |
| DELETE | `/api/admin/ads/:id` | Admin | Delete ad |

### Admin Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/users` | Admin | List all users |
| PATCH | `/api/admin/users/:id/status` | Admin | Suspend/activate user |
| DELETE | `/api/admin/users/:id` | Admin | Delete user |

### Admin Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/reports` | Admin | List all reports |
| PATCH | `/api/admin/reports/:id` | Admin | Resolve/dismiss report |

### Admin Revenue

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/revenue` | Admin | Revenue dashboard data |
| GET | `/api/admin/revenue/by-period` | Admin | Revenue by date range |
| GET | `/api/admin/revenue/by-location` | Admin | Revenue leaderboard by location |

---

## Validation

All request bodies are validated with Zod schemas (see `backend/validators/schemas.ts`). On validation failure, the response is:

```json
{
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

### Key Validation Rules

| Field | Rules |
|-------|-------|
| `name` | 2–50 characters |
| `email` | Valid email format |
| `password` | 8+ chars, must contain uppercase + lowercase + number |
| `title` (ad) | 5–100 characters |
| `description` (ad) | 20–2000 characters |
| `price` (ad) | 0–10000 |
| `age` (ad) | 18–99 |
| `category` (ad) | One of: Escort, Male Escort, Trans, Massage, BDSM, Other |
| `rating` (review) | 1–5 |
| `reason` (report) | 10–500 characters |

---

## Rate Limits

| Scope | Window | Max Requests |
|-------|--------|-------------|
| Global (`/api`) | 15 min | 1000 |
| Auth (login/register) | 15 min | Stricter (configured in index.ts) |
| Ads | Per-route | Configured via `adsRateLimiter` |
| Search | Per-route | Configured via `searchRateLimiter` |
| Location | Per-route | Configured via `locationRateLimiter` |

Rate limit headers are returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## Error Responses

Standard error format:

```json
{
  "message": "Error description",
  "error": "ErrorType"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions (not admin) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
