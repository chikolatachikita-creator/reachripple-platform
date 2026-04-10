# Reach Ripple

Full-stack classified advertising platform built with the MERN stack.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, React Router v6 |
| Backend | Node.js 20, Express 4, TypeScript |
| Database | MongoDB 7.0 (Mongoose ODM) |
| Cache | Redis 7.2 |
| Auth | JWT (access + refresh tokens), bcrypt |
| Real-time | Socket.IO |
| Containerisation | Docker Compose (4 services) |

## Features

- JWT authentication with email verification and password reset
- Ad listing with multi-tier boost system (Spotlight / Prime / Glow)
- Credit wallet and invoice payment flow
- Real-time chat (Socket.IO)
- Reviews, saved profiles, search history
- Full admin panel (users, ads, reports, revenue, settings)
- GeoJSON location search with postcodes.io integration
- Abuse prevention, trust/safety scoring, rate limiting
- Responsive UI (mobile + desktop)

## Quick Start

- Node.js 20+
- MongoDB 7.0+ (or Docker)
- Redis 7.2+ (or Docker)

### Local Development

```bash
# Backend
cd backend
cp .env.example .env        # edit secrets
npm install
npm run dev                  # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm start                    # http://localhost:3000
```

### Docker (all-in-one)

```bash
cd backend
docker-compose up -d         # mongo + redis + backend + frontend
# Frontend  → http://localhost:3000
# Backend   → http://localhost:3001
# MongoDB   → localhost:27017
# Redis     → localhost:6379
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production configuration.

## Project Structure

```
backend/
  index.ts                   # Express app entry point
  config/                    # Security, socket, feature flags
  controllers/               # Request handlers
  middleware/                 # auth, admin, validate (Zod)
  models/                    # 16 Mongoose models
  routes/                    # 17 public route files
  src/routes/                # 6 admin route files
  services/                  # 10 services (bump, cache, chat, email, ranking, …)
  validators/                # Zod schemas
  scripts/                   # Admin seed, user management
  tests/                     # Jest + Supertest API tests

frontend/
  src/
    api/                     # 8 Axios API modules
    components/              # ~42 React components
    context/                 # AuthContext, ToastContextGlobal, SocketContext
    layout/                  # AdminLayout
    pages/                   # 27 pages
  e2e/                       # Playwright E2E tests
```

## Scripts

| Directory | Command | Description |
|-----------|---------|-------------|
| `backend` | `npm run dev` | Start dev server (ts-node-dev, hot reload) |
| `backend` | `npm start` | Start production server |
| `backend` | `npm test` | Run Jest API tests |
| `backend` | `npm run seed:admin` | Create admin user |
| `backend` | `npm run seed:tiers` | Set up demo tier data |
| `frontend` | `npm start` | Start CRA dev server |
| `frontend` | `npm run build` | Production build |
| `frontend` | `npm run test:e2e` | Run Playwright tests |

## Documentation

| Document | Contents |
|----------|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, models, services, data flow |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, env vars, production checklist |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | All API endpoints with auth and params |

## License

All rights reserved.
