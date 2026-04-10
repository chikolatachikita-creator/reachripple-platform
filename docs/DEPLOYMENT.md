# Deployment

## Docker Compose (recommended)

All four services are defined in `backend/docker-compose.yml`.

### Services

| Service | Image | Port | Healthcheck |
|---------|-------|------|-------------|
| `mongo` | `mongo:7.0` | 27017 | `mongosh --eval "db.adminCommand('ping')"` |
| `redis` | `redis:7.2-alpine` | 6379 | `redis-cli -a $REDIS_PASSWORD ping` |
| `backend` | Built from `backend/Dockerfile` | 3001 | Depends on mongo + redis |
| `frontend` | Built from `frontend/Dockerfile` (nginx) | 3000 | Depends on backend |

### Volumes

| Volume | Purpose |
|--------|---------|
| `reachripple_mongo_data` | MongoDB data |
| `reachripple_mongo_config` | MongoDB config |
| `reachripple_redis_data` | Redis persistence |
| `./uploads` | User-uploaded images |
| `./logs` | Application logs |

### Quick Start

```bash
cd backend
cp .env.docker .env          # or create your own
docker-compose up -d
docker-compose logs -f       # watch startup
```

Frontend is available at `http://localhost:3000`, API at `http://localhost:3001`.

### Rebuild

```bash
docker-compose build --no-cache backend frontend
docker-compose up -d
```

---

## Dockerfiles

### Backend (`backend/Dockerfile`)

Multi-stage build:

1. **Builder** — `node:20-alpine`, installs all deps, runs `npx tsc` to compile TypeScript
2. **Production** — `node:20-alpine`, installs `dumb-init` + `curl`, production deps only, copies compiled JS

Entry: `dumb-init -- node index.js`  
Exposed port: 3001

### Frontend (`frontend/Dockerfile`)

Single stage:

1. Copies pre-built `./build` directory into `nginx:alpine`
2. Uses custom `nginx.conf` for SPA routing (try_files)

Entry: `nginx -g "daemon off;"`  
Exposed port: 3000

> **Note:** You must run `npm run build` in `frontend/` before building the Docker image, or add a build stage to the Dockerfile.

---

## Environment Variables

### Backend (required)

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/reachripple-dev` | MongoDB connection string |
| `PORT` | `4000` (dev) / `3001` (docker) | Server port |
| `JWT_SECRET` | — | **Required.** Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | — | **Required.** Secret for signing refresh tokens |
| `FRONTEND_URL` | `http://localhost:3000` | Used for CORS and email links |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed origins |
| `NODE_ENV` | `development` | `development` or `production` |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection URL |

### Backend (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_SERVICE` | `gmail` | Nodemailer transport service |
| `EMAIL_USER` | — | SMTP username |
| `EMAIL_PASS` | — | SMTP password |
| `SMTP_HOST` | — | Custom SMTP host (overrides EMAIL_SERVICE) |
| `SMTP_PORT` | `587` | Custom SMTP port |
| `SMTP_FROM` | — | From address for emails |
| `AWS_ACCESS_KEY_ID` | — | S3 uploads (not wired yet) |
| `AWS_SECRET_ACCESS_KEY` | — | S3 uploads |
| `AWS_REGION` | `us-east-1` | S3 region |
| `AWS_S3_BUCKET` | — | S3 bucket name |
| `OPENAI_API_KEY` | — | AI route features |
| `CACHE_ENABLED` | `true` | Enable/disable Redis caching |
| `REDIS_PASSWORD` | — | Redis auth password |
| `ADMIN_EMAIL` | — | Default admin email (Docker seed) |
| `ADMIN_PASSWORD` | — | Default admin password (Docker seed) |
| `ADMIN_NAME` | — | Default admin display name |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_BASE_URL` | `http://localhost:3001/api` | Backend API base URL |
| `REACT_APP_ENVIRONMENT` | — | `production` / `development` |

### Docker-specific

The file `backend/.env.docker` provides Docker-ready defaults including:
- MongoDB with auth: `mongodb://admin:password123@mongo:27017/reachripple-dev?authSource=admin`
- Redis with password: `redis://default:redis123@redis:6379`
- Pre-set JWT secrets

---

## Local Development (without Docker)

### Prerequisites

- Node.js 20+
- MongoDB 7.0+ running locally
- Redis 7.2+ running locally (optional — caching degrades gracefully)

### Steps

```bash
# 1. Backend
cd backend
cp .env.example .env
# Edit .env: set JWT_SECRET and JWT_REFRESH_SECRET
npm install
npm run dev                    # ts-node-dev with hot reload → port 4000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm start                      # CRA dev server → port 3000
```

### Seed Data

```bash
cd backend
npm run seed:admin             # Create admin user (prompts for email/password)
npm run seed:tiers             # Set up demo tier configuration
```

---

## Production Checklist

- [ ] Generate strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (64+ chars)
- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas or a secured MongoDB instance
- [ ] Set `REDIS_URL` to a password-protected Redis instance
- [ ] Configure `CORS_ORIGIN` to your production domain only
- [ ] Set up SMTP credentials for transactional emails
- [ ] Run `npm run build` in `frontend/` for the production bundle
- [ ] Put nginx or a reverse proxy in front with TLS
- [ ] Set up MongoDB backups (scheduled `mongodump` or Atlas backups)
- [ ] Review rate limiter settings in `backend/index.ts`

---

## Health Check

```bash
curl http://localhost:3001/health
# Returns: { status: "ok", uptime, memory, redis, mongo }

curl http://localhost:3001/health/flags
# Returns: feature flag status
```

---

## Useful Commands

```bash
# Compile backend TypeScript (no emit, just check)
cd backend && npx tsc --noEmit

# Build frontend production bundle
cd frontend && npm run build

# Run backend tests
cd backend && npm test

# Run frontend E2E tests
cd frontend && npm run test:e2e

# Docker logs
docker-compose -f backend/docker-compose.yml logs -f backend

# MongoDB shell (Docker)
docker exec -it $(docker ps -qf name=mongo) mongosh -u admin -p password123

# Redis CLI (Docker)
docker exec -it $(docker ps -qf name=redis) redis-cli -a redis123
```
