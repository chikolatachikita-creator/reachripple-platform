#!/bin/bash
# Docker Setup Verification Script
# This script verifies that all Docker services are properly configured

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

echo "================================================"
echo "Reach Ripple Docker Setup Verification"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed() {
    echo -e "${GREEN}✓${NC} $1"
}

check_failed() {
    echo -e "${RED}✗${NC} $1"
}

check_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check Docker installation
echo "1. Checking Docker Installation..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    check_passed "Docker installed: $DOCKER_VERSION"
else
    check_failed "Docker not found"
    exit 1
fi

# 2. Check Docker Compose
echo ""
echo "2. Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    check_passed "Docker Compose installed: $COMPOSE_VERSION"
else
    check_failed "Docker Compose not found"
    exit 1
fi

# 3. Check Docker daemon
echo ""
echo "3. Checking Docker Daemon..."
if docker ps &> /dev/null; then
    check_passed "Docker daemon is running"
else
    check_failed "Docker daemon is not running"
    exit 1
fi

# 4. Verify docker-compose.yml
echo ""
echo "4. Checking docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    check_passed "docker-compose.yml found"
    
    # Check for required services
    services=("mongo" "redis" "backend" "frontend")
    for service in "${services[@]}"; do
        if grep -q "^  $service:" docker-compose.yml; then
            check_passed "Service '$service' configured"
        else
            check_failed "Service '$service' not found in docker-compose.yml"
        fi
    done
else
    check_failed "docker-compose.yml not found"
    exit 1
fi

# 5. Verify Dockerfiles
echo ""
echo "5. Checking Dockerfiles..."
if [ -f "Dockerfile" ]; then
    check_passed "backend/Dockerfile found"
else
    check_failed "backend/Dockerfile not found"
fi

if [ -f "../frontend/Dockerfile" ]; then
    check_passed "frontend/Dockerfile found"
else
    check_failed "frontend/Dockerfile not found"
fi

# 6. Verify nginx.conf
echo ""
echo "6. Checking frontend nginx configuration..."
if [ -f "../frontend/nginx.conf" ]; then
    check_passed "frontend/nginx.conf found"
    
    if grep -q "proxy_pass http://backend:3001" ../frontend/nginx.conf; then
        check_passed "Nginx backend proxy configured correctly"
    else
        check_failed "Nginx backend proxy not configured correctly"
    fi
else
    check_failed "frontend/nginx.conf not found"
fi

# 7. Verify .dockerignore files
echo ""
echo "7. Checking .dockerignore files..."
if [ -f ".dockerignore" ]; then
    check_passed "backend/.dockerignore found"
else
    check_failed "backend/.dockerignore not found"
fi

if [ -f "../frontend/.dockerignore" ]; then
    check_passed "frontend/.dockerignore found"
else
    check_failed "frontend/.dockerignore not found"
fi

# 8. Check environment files
echo ""
echo "8. Checking environment files..."
if [ -f ".env" ]; then
    check_passed "backend/.env found"
    
    if grep -q "MONGO_URI" .env; then
        check_passed "MONGO_URI configured"
    else
        check_warning "MONGO_URI not found in .env (will use docker-compose variables)"
    fi
else
    check_failed "backend/.env not found"
fi

if [ -f "../frontend/.env.local" ]; then
    check_passed "frontend/.env.local found"
else
    check_failed "frontend/.env.local not found"
fi

# 9. Check package.json files
echo ""
echo "9. Checking package.json files..."
if [ -f "package.json" ]; then
    check_passed "backend/package.json found"
    
    if grep -q '"start"' package.json; then
        check_passed "Start script configured in backend"
    else
        check_failed "Start script not found in backend package.json"
    fi
else
    check_failed "backend/package.json not found"
fi

if [ -f "../frontend/package.json" ]; then
    check_passed "frontend/package.json found"
    
    if grep -q '"build"' ../frontend/package.json; then
        check_passed "Build script configured in frontend"
    else
        check_failed "Build script not found in frontend package.json"
    fi
else
    check_failed "frontend/package.json not found"
fi

# 10. Check ports availability
echo ""
echo "10. Checking port availability..."
PORTS=(3000 3001 27017 6379)
for port in "${PORTS[@]}"; do
    if ! nc -z localhost $port 2>/dev/null; then
        check_passed "Port $port is available"
    else
        check_warning "Port $port might already be in use"
    fi
done

# 11. Final summary
echo ""
echo "================================================"
echo "Verification Summary"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Build images:  docker-compose build"
echo "2. Start services: docker-compose up -d"
echo "3. Check status:  docker-compose ps"
echo "4. View logs:     docker-compose logs -f"
echo "5. Access app:    http://localhost:3000"
echo ""
echo "For more help, see: DOCKER_DEPLOYMENT_GUIDE.md"
echo ""
