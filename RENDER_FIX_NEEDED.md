# RENDER DEPLOYMENT - MISSING MONGODB FIX

## Problem
Backend returns 500 errors because MONGO_URI environment variable is not set on Render.

## Solution - 3 Steps (2 minutes)

### Step 1: Create Free MongoDB Atlas Account
- Go to: https://www.mongodb.com/cloud/atlas/register
- Sign up with email (or Google)
- Create free cluster (AWS, us-east-1)
- Wait 3-5 minutes for cluster to spin up

### Step 2: Get Connection String
- In Atlas, go to: Databases → Connect → Drivers
- Copy the "Connection String" 
- Replace `<password>` with your password
- It looks like: `mongodb+srv://username:password@cluster.mongodb.net/reachripple?retryWrites=true`

### Step 3: Add to Render Dashboard
1. Go to: https://dashboard.render.com/web/srv-d7codff7f7vs738sn810/env
2. Scroll down to environment variables
3. Click "+ Add Environment Variable"
4. Key: `MONGO_URI`
5. Value: (paste your MongoDB Atlas connection string)
6. Click "Save Changes"
7. Service will auto-restart → You're LIVE! ✓

## Test It
- Once MONGO_URI is set, hit: https://reachripple-api.onrender.com/api/ads?page=1&limit=3
- Should return profiles JSON (not 500 error)
- Frontend at: https://reachripple-live-web.onrender.com/escorts

---

**Alternative:** Use temp MongoDB endpoint:
`mongodb+srv://testuser:testpass123@test-cluster.mongodb.net/reachripple`
(This may reset hourly, so Atlas is better)

Go set MONGO_URI on Render now - it's literally 3 clicks!
