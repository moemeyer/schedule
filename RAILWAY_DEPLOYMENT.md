# 🚂 Railway Deployment Guide

**Deploy in 5-10 minutes | Perfect for 1-4 users | $5/month**

## Why Railway for This App?

- ✅ **Fastest deployment**: 5-10 minutes total
- ✅ **Built-in PostgreSQL + PostGIS**: No database setup needed
- ✅ **Auto-deploys from GitHub**: Push code = instant deploy
- ✅ **WebSocket support**: Perfect for GPS tracking
- ✅ **No infrastructure management**: Railway handles everything
- ✅ **$5/month free credit**: Likely covers your entire usage!

---

## Prerequisites

- ✅ Railway account with $5 plan (you have this)
- ✅ GitHub repository (you have this)
- ✅ Railway CLI or web interface

---

## 🚀 Method 1: Railway CLI (Fastest)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login

```bash
railway login --browserless
```

Follow the URL provided and paste your token.

### Step 3: Link to Project

```bash
cd /home/user/schedule

# Initialize new Railway project
railway init

# Choose: "Create new project"
# Project name: "routing-service"
```

### Step 4: Add PostgreSQL

```bash
railway add

# Choose: PostgreSQL
# This creates a PostgreSQL database with PostGIS support
```

### Step 5: Set Environment Variables

```bash
# Required variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set CORS_ORIGIN=*

# Optional - Google Maps API key
railway variables set GOOGLE_MAPS_API_KEY=your_key_here

# Routing configuration
railway variables set MAX_ROUTES_PER_DAY=50
railway variables set MAX_STOPS_PER_ROUTE=25
railway variables set DEFAULT_SERVICE_DURATION_MINUTES=60
railway variables set GPS_UPDATE_INTERVAL_MS=30000
```

**Note:** Railway automatically sets `DATABASE_URL` for you!

### Step 6: Link GitHub Repository

```bash
# If not already linked
railway link

# Or connect from the Railway dashboard
```

### Step 7: Deploy!

```bash
railway up

# Or push to GitHub (if auto-deploy is enabled)
git push origin main
```

### Step 8: Get Your URL

```bash
railway domain

# Or from Railway dashboard, enable a public domain
```

**Done!** Your app is live! 🎉

---

## 🌐 Method 2: Railway Web Dashboard (No CLI)

### Step 1: Create New Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your `moemeyer/schedule` repository
5. Choose branch: `claude/intelligent-routing-service-011CUM2Tizir16Z1wrYo3KCY`

### Step 2: Add Database

1. Click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway automatically provisions PostgreSQL with PostGIS support
3. Railway auto-injects `DATABASE_URL` into your app

### Step 3: Configure Environment Variables

In the Railway dashboard, go to your service → **Variables**:

Add these variables:
```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
MAX_ROUTES_PER_DAY=50
MAX_STOPS_PER_ROUTE=25
DEFAULT_SERVICE_DURATION_MINUTES=60
GPS_UPDATE_INTERVAL_MS=30000
```

Optional:
```
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Step 4: Setup Database Extensions

Click on your **PostgreSQL database** → **Data** → **Query**

Run this SQL:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Step 5: Configure Build Settings

Go to your service → **Settings** → **Build Command**:

Set build command:
```bash
npm ci && npm run build && cd client && npm ci && npm run build
```

Set start command:
```bash
node dist/server.js
```

### Step 6: Enable Public Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy your Railway URL (e.g., `routing-service-production.up.railway.app`)

### Step 7: Deploy

Click **"Deploy"** or push to GitHub if auto-deploy is enabled.

**Done!** ✨

---

## 🔧 Running Database Migrations

After first deployment, you need to set up the database schema.

### Option 1: Railway Dashboard

1. Go to PostgreSQL database → **Data** → **Query**
2. Copy contents of `src/database/schema.sql`
3. Paste and execute

### Option 2: From Local Machine

```bash
# Get database connection URL from Railway
railway variables

# Copy the DATABASE_URL value, then:
psql <DATABASE_URL> < src/database/schema.sql

# Optional: Load sample data
psql <DATABASE_URL> < src/database/seed.sql
```

### Option 3: Via Railway CLI

```bash
# Connect to Railway database
railway connect postgres

# Then run:
\i src/database/schema.sql
\i src/database/seed.sql
\q
```

---

## 📊 Verify Deployment

### Check Build Logs

```bash
railway logs
```

Or in the Railway dashboard: **Deployments** → Click latest deployment → **View Logs**

### Test API

```bash
# Get your Railway URL
RAILWAY_URL=$(railway domain)

# Test health endpoint
curl https://${RAILWAY_URL}/api/health
```

### Open Application

```bash
# Open in browser
railway open

# Or manually go to your Railway URL
```

---

## 💰 Cost Estimate for 1-4 Users

**Railway Pricing:**
- **$5/month free credit** (you have this)
- Usage-based billing after credit

**Estimated Monthly Usage:**
- **Backend service**: ~$3-5/month
- **PostgreSQL**: ~$2-3/month
- **Total**: **~$5-8/month**

**Your $5 credit should cover most or all of your usage!** 🎉

If you exceed credit, you'll only pay for what you use above $5.

---

## 🔄 Auto-Deploy from GitHub

Railway automatically deploys when you push to your connected branch!

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push origin claude/intelligent-routing-service-011CUM2Tizir16Z1wrYo3KCY

# Railway automatically builds and deploys! ✨
```

---

## 📝 Managing Your Deployment

### View Logs

```bash
railway logs
```

Or in dashboard: **Deployments** → **Logs**

### Restart Service

```bash
railway restart
```

Or in dashboard: Click service → **Settings** → **Restart**

### Add Custom Domain

1. Go to **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `routing.yourdomain.com`)
4. Add CNAME record to your DNS:
   ```
   routing CNAME routing-service-production.up.railway.app
   ```

### Environment Variables

```bash
# List all variables
railway variables

# Set a variable
railway variables set KEY=value

# Delete a variable
railway variables delete KEY
```

---

## 🔒 Security Best Practices

### 1. Use Secrets for Sensitive Data

Store sensitive data as Railway variables (they're encrypted):
```bash
railway variables set DB_PASSWORD=<secure-password>
railway variables set GOOGLE_MAPS_API_KEY=<your-api-key>
```

### 2. Enable CORS Properly

For production, set specific origins:
```bash
railway variables set CORS_ORIGIN=https://yourdomain.com
```

### 3. Use Environment-Specific Settings

Railway automatically sets `NODE_ENV=production`

---

## 🐛 Troubleshooting

### Build Fails

**Check build logs:**
```bash
railway logs --build
```

**Common issues:**
- Missing dependencies → Check `package.json`
- TypeScript errors → Run `npm run build` locally first
- Out of memory → Increase memory in Railway settings

### Application Won't Start

**Check runtime logs:**
```bash
railway logs
```

**Common issues:**
- Database connection → Verify `DATABASE_URL` is set
- Port issues → Railway sets `PORT` automatically, use `process.env.PORT || 3000`
- Missing environment variables → Check `railway variables`

### Database Connection Issues

**Verify database is running:**
```bash
railway status
```

**Test connection:**
```bash
railway connect postgres
```

**Check if PostGIS is enabled:**
```sql
SELECT PostGIS_version();
```

### Can't Access Application

**Check if domain is generated:**
```bash
railway domain
```

**Check service status:**
```bash
railway status
```

**Verify deployment succeeded:**
Check dashboard → **Deployments** → Latest should show ✅

---

## 📈 Monitoring

### View Metrics

Railway dashboard shows:
- CPU usage
- Memory usage
- Network traffic
- Request count

### Set Up Alerts

In Railway dashboard:
1. Go to **Settings** → **Notifications**
2. Configure deployment notifications
3. Connect to Slack/Discord/Email

---

## 🔄 Updates and Rollbacks

### Update Application

Just push to GitHub:
```bash
git push origin claude/intelligent-routing-service-011CUM2Tizir16Z1wrYo3KCY
```

Railway auto-deploys! ✨

### Rollback to Previous Version

In Railway dashboard:
1. Go to **Deployments**
2. Find the working deployment
3. Click **"..."** → **"Redeploy"**

Or via CLI:
```bash
railway up --detach
```

---

## 💾 Database Backups

Railway doesn't auto-backup on the Hobby plan. Set up manual backups:

```bash
# Get database URL
railway variables | grep DATABASE_URL

# Create backup
pg_dump <DATABASE_URL> > backup-$(date +%Y%m%d).sql

# Restore backup
psql <DATABASE_URL> < backup-20240101.sql
```

**Recommended:** Set up automated backups using GitHub Actions or a cron job.

---

## 🎯 Optimization Tips

### 1. Reduce Cold Starts

Railway may spin down services on the Hobby plan. To keep it running:
- Upgrade to Pro plan ($20/month)
- Or use a cron job to ping your app every 10 minutes

### 2. Optimize Build Time

Add to `.railwayignore`:
```
node_modules
dist
.git
*.log
```

### 3. Use Build Cache

Railway automatically caches dependencies for faster builds.

---

## 🆚 Railway vs AWS Comparison

| Feature | Railway | AWS EC2 |
|---------|---------|---------|
| Setup Time | 5-10 min | 30-60 min |
| Complexity | Very Easy | Medium-Hard |
| Auto-deploys | ✅ Yes | ❌ Manual |
| Database | Built-in | Setup required |
| Cost (1-4 users) | $5-8/mo | $0-15/mo |
| Scaling | Automatic | Manual |
| Monitoring | Built-in | Setup required |

**For 1-4 users:** Railway is perfect!
**For 100+ users:** Consider AWS

---

## ✅ Success Checklist

- [ ] Railway CLI installed
- [ ] Logged into Railway
- [ ] Project created
- [ ] PostgreSQL database added
- [ ] Environment variables set
- [ ] GitHub repository connected
- [ ] Application deployed
- [ ] Database schema migrated
- [ ] Public domain generated
- [ ] Application accessible via URL
- [ ] Health check endpoint working

---

## 🎉 You're Live!

Your Intelligent Routing Service is now running on Railway!

**Access your app:**
- Dashboard: `https://your-app.up.railway.app`
- API: `https://your-app.up.railway.app/api/health`

**For 1-4 users, Railway is the perfect solution!** 🚀

---

## 📞 Support

**Railway Resources:**
- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://railway.app/status)

**Your App:**
- Check `TEST_REPORT.md` for known limitations
- Review `README.md` for application features
- See `API.md` for API documentation

---

**Deployment time: ~10 minutes | Monthly cost: ~$5-8 | Perfect for startups!** ✨
