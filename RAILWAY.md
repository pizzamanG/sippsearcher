# 🚂 Railway Deployment Guide

Your SippSearcher app is now **100% ready** for Railway deployment!

## ✅ What's Fixed
- ❌ Removed `better-sqlite3` compilation issues
- ✅ Clean `package-lock.json` (no sqlite3 dependencies)
- ✅ PostgreSQL support for Railway
- ✅ In-memory fallback (works without database)
- ✅ Health check endpoint at `/health`
- ✅ Fixed 502 errors: bind to `0.0.0.0` interface
- ✅ Added debug logging and error handling
- ✅ Graceful shutdown handling

## 🚀 Deploy to Railway

### Step 1: Push to GitHub
```bash
git push origin main
```

### Step 2: Deploy on Railway
1. Go to [Railway.app](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Select your `sippsearcher` repository
4. Click "Deploy Now"

### Step 3: Add PostgreSQL Database
1. In Railway dashboard: **New** → **Database** → **PostgreSQL**
2. Railway automatically provides `DATABASE_URL`

### Step 4: Set Environment Variables
- Add `GOOGLE_MAPS_API_KEY` in Variables section
- `DATABASE_URL` is automatically configured

### Step 5: Seed Database (Optional)
```bash
# In Railway console or using Railway CLI
npm run seed:railway
```

### Step 6: Test Deployment
- Visit your Railway URL (e.g., `https://your-app.railway.app`)
- Check health: `https://your-app.railway.app/health`

## 🔍 Health Check
Your app includes a health endpoint at `/health` that shows:
- Server status
- Database type (PostgreSQL/In-Memory)
- Timestamp
- Store count

## 🎯 Expected Behavior
- **Railway Production**: Uses PostgreSQL
- **No Database**: Uses in-memory storage (still works!)
- **Local Dev**: Install SQLite separately if needed

## 🔧 Troubleshooting

### 502 Bad Gateway Errors
✅ **FIXED**: App now binds to `0.0.0.0` interface (required for Railway)

### Checking Logs
- **Deploy Logs**: Check Railway dashboard for build/start issues
- **Health Check**: Visit `/health` endpoint to verify status
- **Debug Info**: Startup logs show PORT, DATABASE_URL, and environment

### Expected Startup Logs
```
🚀 Starting SippSearcher...
📍 PORT: 3000
🔑 DATABASE_URL: SET
🗺️ GOOGLE_MAPS_API_KEY: SET
🐘 Using PostgreSQL for Railway deployment
🥤 SippSearcher server running on port 3000
🌐 Server accessible at http://0.0.0.0:3000
🐘 Connected to PostgreSQL database
```

## ✅ Ready for Deployment!
Your `package.json` and `package-lock.json` are now perfectly synchronized for Railway's `npm ci` command. 