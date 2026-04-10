# ReachRipple — Production Deployment Guide

## Server: Cyprus VPS → Serving UK Users

---

## 1. VPS REQUIREMENTS

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Bandwidth | 1 TB/month | Unmetered |

**Cyprus VPS Providers:** Netshop-ISP (Limassol), OVH (via EU), Hetzner (nearby DE), Contabo.

---

## 2. DOMAIN & DNS

1. Register your domain (e.g. `reachripple.com`) with any registrar (Namecheap, Cloudflare, Porkbun)
2. Point DNS A records to your Cyprus VPS IP:
   ```
   A    @              → YOUR_VPS_IP
   A    www            → YOUR_VPS_IP
   ```
3. (Recommended) Use **Cloudflare** as DNS proxy for DDoS protection and CDN caching:
   - Set SSL mode to **Full (Strict)** once certs are installed
   - Enable "Always Use HTTPS"
   - This also helps UK latency — Cloudflare caches static assets at UK edge nodes

---

## 3. SERVER SETUP (ONE-TIME)

SSH into your VPS and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (v2 is included with modern Docker)
docker compose version  # should show v2.x

# Install Certbot (for SSL certificates)
sudo apt install certbot -y

# Create app directory
sudo mkdir -p /opt/reachripple
sudo chown $USER:$USER /opt/reachripple
```

Log out and back in for Docker group to take effect.

---

## 4. DEPLOY THE APPLICATION

```bash
cd /opt/reachripple

# Clone or upload your repo
git clone YOUR_REPO_URL .

# Create proxy directories
mkdir -p proxy/certs

# Copy and edit the production environment file
cp .env.production .env
nano .env
```

### Fill in `.env`:
```env
DOMAIN=reachripple.com
CORS_ORIGIN=https://reachripple.com
FRONTEND_URL=https://reachripple.com

MONGO_ROOT_USER=reachripple_admin
MONGO_ROOT_PASSWORD=<generate: openssl rand -base64 32>

REDIS_PASSWORD=<generate: openssl rand -base64 32>

JWT_SECRET=<generate: openssl rand -hex 64>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 64>

SMTP_HOST=smtp.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-key
SMTP_PASS=your-brevo-password
SMTP_FROM=noreply@reachripple.com
```

### Update proxy nginx config with your domain:
```bash
sed -i 's/yourdomain.com/reachripple.com/g' proxy/nginx.conf
```

---

## 5. SSL CERTIFICATES (Let's Encrypt)

### Option A — Certbot standalone (before first deploy)
```bash
# Stop anything on port 80
sudo certbot certonly --standalone -d reachripple.com -d www.reachripple.com

# Copy certs to proxy directory
sudo cp /etc/letsencrypt/live/reachripple.com/fullchain.pem proxy/certs/
sudo cp /etc/letsencrypt/live/reachripple.com/privkey.pem proxy/certs/
sudo chmod 644 proxy/certs/*.pem
```

### Option B — If using Cloudflare (simpler)
1. In Cloudflare dashboard → SSL/TLS → Origin Server → Create Certificate
2. Download the certificate and private key
3. Save as `proxy/certs/fullchain.pem` and `proxy/certs/privkey.pem`
4. Set Cloudflare SSL mode to **Full (Strict)**

### Auto-renewal (for Option A):
```bash
# Add cron job for cert renewal
echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/reachripple.com/fullchain.pem /opt/reachripple/proxy/certs/ && cp /etc/letsencrypt/live/reachripple.com/privkey.pem /opt/reachripple/proxy/certs/ && docker restart reachripple-proxy" | sudo tee /etc/cron.d/certbot-renew
```

---

## 6. BUILD & LAUNCH

```bash
cd /opt/reachripple

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs -f --tail=50
```

Expected output — 5 containers running:
| Container | Port | Notes |
|-----------|------|-------|
| reachripple-proxy | 80, 443 | Public-facing |
| reachripple-frontend | 3000 (internal) | Not exposed |
| reachripple-backend | 3001 (internal) | Not exposed |
| reachripple-mongo | 27017 (internal) | Not exposed |
| reachripple-redis | 6379 (internal) | Not exposed |

---

## 7. FIRST-TIME SETUP

```bash
# Create admin account
docker exec -it reachripple-backend node dist/scripts/createAdmin.js

# Verify health endpoint
curl -k https://reachripple.com/api/health
```

---

## 8. BACKUPS

### Automated MongoDB backup (daily):
```bash
# Create backup script
cat > /opt/reachripple/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/reachripple/backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"
docker exec reachripple-mongo mongodump \
  --username=$MONGO_ROOT_USER \
  --password=$MONGO_ROOT_PASSWORD \
  --authenticationDatabase=admin \
  --db=reachripple \
  --out=/tmp/backup
docker cp reachripple-mongo:/tmp/backup "$BACKUP_DIR"
# Keep only last 30 days
find /opt/reachripple/backups -maxdepth 1 -mtime +30 -type d -exec rm -rf {} +
EOF

chmod +x /opt/reachripple/backup.sh

# Schedule daily at 2 AM
echo "0 2 * * * /opt/reachripple/backup.sh" | crontab -
```

---

## 9. MONITORING

### Basic health check:
```bash
# Quick container status
docker compose -f docker-compose.prod.yml ps

# View backend logs
docker logs reachripple-backend --tail=100 -f

# View proxy access logs
docker logs reachripple-proxy --tail=100 -f

# Disk usage
docker system df
```

### Recommended: Set up UptimeRobot (free)
- Monitor `https://reachripple.com/api/health` every 5 minutes
- Get email/SMS alerts on downtime

---

## 10. UPDATING THE APPLICATION

```bash
cd /opt/reachripple

# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime is not built in — expect ~30s downtime)
docker compose -f docker-compose.prod.yml up -d --build

# Verify
docker compose -f docker-compose.prod.yml ps
```

---

## 11. FIREWALL

```bash
# Allow only SSH, HTTP, HTTPS
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

MongoDB (27017) and Redis (6379) are NOT exposed to the host in the production compose, so no firewall rules needed for them.

---

## 12. UK LATENCY OPTIMISATION

Since the server is in Cyprus (~3,500km from UK), expect ~40-60ms latency. To minimise impact:

1. **Cloudflare CDN** (free) — Caches static assets (JS, CSS, images) at UK edge nodes. First page load feels instant.
2. **Image optimisation** — Already configured with max 10MB uploads. Consider adding WebP conversion.
3. **Gzip compression** — Already enabled in nginx config ✅
4. **Browser caching** — Static assets cached for 30 days ✅

With Cloudflare, UK users will experience <20ms for cached content, and ~50ms for API calls — perfectly acceptable.

---

## FILES CREATED FOR PRODUCTION

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production compose — no exposed DB/Redis ports, SSL proxy |
| `proxy/nginx.conf` | SSL termination, HTTP→HTTPS redirect, security headers |
| `.env.production` | Template for production environment variables |
| `docs/UK_LEGAL_COMPLIANCE_CHECKLIST.md` | Legal & regulatory requirements |
| `docs/DEPLOYMENT_GUIDE.md` | This file |
