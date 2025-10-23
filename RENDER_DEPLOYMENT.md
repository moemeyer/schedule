# 🎨 Render.com Deployment - EASIEST METHOD!

**Deploy in 5-10 minutes with just clicking!**

Perfect for 1-4 users | $7-15/month | Zero infrastructure management

---

## ✨ Why Render?

- ✅ **Simplest UI** - Just click buttons
- ✅ **Auto-detects everything** - No manual build config
- ✅ **Free PostgreSQL** - With PostGIS support
- ✅ **Auto SSL/HTTPS** - Free certificates
- ✅ **Auto-deploy from Git** - Push = deploy
- ✅ **Better than Railway** - Cleaner interface, easier setup

---

## 🚀 Method 1: Blueprint Deploy (FASTEST - 1 Click!)

### Step 1: Commit render.yaml

The `render.yaml` file is already in your repository! Just make sure it's pushed:

```bash
git add render.yaml
git commit -m "Add Render configuration"
git push origin claude/intelligent-routing-service-011CUM2Tizir16Z1wrYo3KCY
```

### Step 2: Deploy with Blueprint

1. Go to https://render.com
2. Sign up / Log in (free account)
3. Click **"New +"** → **"Blueprint"**
4. Connect your GitHub account
5. Select repository: `moemeyer/schedule`
6. Select branch: `claude/intelligent-routing-service-011CUM2Tizir16Z1wrYo3KCY`
7. Click **"Apply"**

**That's it!** Render reads the `render.yaml` and sets up everything automatically:
- ✅ Web service
- ✅ PostgreSQL database
- ✅ All environment variables
- ✅ Database connection

**Time: 5-8 minutes** ⏱️

---

## 🌐 Method 2: Manual Web UI (Also Easy!)

If Blueprint doesn't work, here's the manual method (still super easy):

### Step 1: Sign Up

1. Go to https://render.com
2. Click **"Get Started"**
3. Sign up with GitHub (easiest)
4. Authorize Render to access your repositories

### Step 2: Create PostgreSQL Database

1. Click **"New +"** → **"PostgreSQL"**
2. Fill in:
   - **Name**: `routing-db`
   - **Database**: `routing_db`
   - **User**: `routing_user`
   - **Region**: Choose closest to you (e.g., Oregon)
   - **Plan**: **Free** (perfect for 1-4 users!)
3. Click **"Create Database"**

**Wait 1-2 minutes for database to provision**

### Step 3: Enable PostGIS Extension

1. Click on your database (`routing-db`)
2. Scroll down to **"Connect"** section
3. Click **"PSQL Command"** - copy it
4. Open your terminal and paste the command (it will look like):
   ```bash
   PGPASSWORD=xxx psql -h xxx.render.com -U routing_user routing_db
   ```
5. In the PostgreSQL prompt, run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   \q
   ```

### Step 4: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Click **"Connect a repository"**
3. Find `moemeyer/schedule` and click **"Connect"**
4. Fill in:
   - **Name**: `routing-service`
   - **Region**: Same as database (e.g., Oregon)
   - **Branch**: `claude/intelligent-routing-service-011CUM2Tizir16Z1wrYo3KCY`
   - **Root Directory**: Leave blank
   - **Runtime**: **Node**
   - **Build Command**:
     ```bash
     npm ci && npm run build && cd client && npm ci && npm run build
     ```
   - **Start Command**:
     ```bash
     node dist/server.js
     ```
   - **Plan**: **Starter** ($7/month - perfect for you!)

### Step 5: Add Environment Variables

Scroll down to **"Environment Variables"** and add these:

Click **"Add Environment Variable"** for each:

```
NODE_ENV = production
PORT = 3000
CORS_ORIGIN = *
MAX_ROUTES_PER_DAY = 50
MAX_STOPS_PER_ROUTE = 25
DEFAULT_SERVICE_DURATION_MINUTES = 60
GPS_UPDATE_INTERVAL_MS = 30000
GOOGLE_MAPS_API_KEY = AIzaSyCMp77_tcfaJjQ8u2KXGrkjYRJJRmhmW08
```

**Important:** Add database connection:

1. Click **"Add Environment Variable"**
2. Key: `DATABASE_URL`
3. Click the **"Add from database"** dropdown
4. Select your database: `routing-db`
5. Select property: **Internal Database URL**

### Step 6: Deploy!

1. Scroll to bottom
2. Click **"Create Web Service"**

Render will:
- ✅ Clone your repository
- ✅ Install dependencies
- ✅ Build frontend and backend
- ✅ Start your application
- ✅ Assign a URL

**Time: 5-8 minutes** ⏱️

---

## 📊 Setup Database Schema

After first deployment succeeds, you need to create tables:

### Option 1: Using PSQL Command (Easiest)

1. In Render dashboard, click your **database** (`routing-db`)
2. Copy the **PSQL Command** from the Connect section
3. In your terminal:
   ```bash
   # Use the command Render gives you, then:
   psql <PASTE_RENDER_CONNECTION_STRING>
   ```
4. Copy and paste this entire SQL:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Technicians table
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    skills JSONB NOT NULL DEFAULT '[]',
    home_location GEOGRAPHY(POINT, 4326) NOT NULL,
    home_address TEXT,
    available_hours JSONB NOT NULL DEFAULT '[]',
    max_jobs_per_day INTEGER DEFAULT 10,
    active BOOLEAN DEFAULT true,
    current_location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    license_plate VARCHAR(50) UNIQUE NOT NULL,
    capacity DECIMAL(10, 2),
    equipment_types JSONB NOT NULL DEFAULT '[]',
    fuel_efficiency DECIMAL(10, 2),
    max_range_km DECIMAL(10, 2),
    active BOOLEAN DEFAULT true,
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    current_location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    estimated_duration_minutes INTEGER NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    time_window_start TIMESTAMP,
    time_window_end TIMESTAMP,
    required_skills JSONB NOT NULL DEFAULT '[]',
    required_equipment JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    assigned_route_id UUID,
    scheduled_time TIMESTAMP,
    completed_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Routes table
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'draft',
    start_location GEOGRAPHY(POINT, 4326) NOT NULL,
    start_address TEXT,
    end_location GEOGRAPHY(POINT, 4326) NOT NULL,
    end_address TEXT,
    total_distance_km DECIMAL(10, 2) DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    optimization_score DECIMAL(5, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(technician_id, date)
);

-- Route stops table
CREATE TABLE route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    estimated_arrival_time TIMESTAMP NOT NULL,
    estimated_departure_time TIMESTAMP NOT NULL,
    actual_arrival_time TIMESTAMP,
    actual_departure_time TIMESTAMP,
    distance_from_previous_km DECIMAL(10, 2) DEFAULT 0,
    duration_from_previous_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(route_id, sequence_number),
    UNIQUE(route_id, job_id)
);

-- GPS tracking table
CREATE TABLE gps_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    speed DECIMAL(10, 2),
    heading DECIMAL(10, 2),
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Distance matrix cache table
CREATE TABLE distance_matrix_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_lat DECIMAL(10, 8) NOT NULL,
    origin_lng DECIMAL(11, 8) NOT NULL,
    destination_lat DECIMAL(10, 8) NOT NULL,
    destination_lng DECIMAL(11, 8) NOT NULL,
    distance_km DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Foreign keys and indexes
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_routes
    FOREIGN KEY (assigned_route_id) REFERENCES routes(id) ON DELETE SET NULL;

CREATE INDEX idx_technicians_active ON technicians(active);
CREATE INDEX idx_technicians_location ON technicians USING GIST(current_location);
CREATE INDEX idx_vehicles_active ON vehicles(active);
CREATE INDEX idx_vehicles_assigned ON vehicles(assigned_technician_id);
CREATE INDEX idx_customers_location ON customers USING GIST(location);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs USING GIST(location);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_technician ON jobs(assigned_technician_id);
CREATE INDEX idx_jobs_route ON jobs(assigned_route_id);
CREATE INDEX idx_jobs_time_window ON jobs(time_window_start, time_window_end);
CREATE INDEX idx_routes_date ON routes(date);
CREATE INDEX idx_routes_technician ON routes(technician_id);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_route_stops_route ON route_stops(route_id);
CREATE INDEX idx_route_stops_job ON route_stops(job_id);
CREATE INDEX idx_route_stops_sequence ON route_stops(route_id, sequence_number);
CREATE INDEX idx_gps_technician ON gps_updates(technician_id);
CREATE INDEX idx_gps_timestamp ON gps_updates(timestamp DESC);
CREATE INDEX idx_distance_cache_origin ON distance_matrix_cache(origin_lat, origin_lng);
CREATE INDEX idx_distance_cache_destination ON distance_matrix_cache(destination_lat, destination_lng);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON technicians
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_route_stops_updated_at BEFORE UPDATE ON route_stops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Type `\q` to exit.

### Option 2: Local psql

```bash
# Get connection string from Render dashboard
psql <CONNECTION_STRING> < src/database/schema.sql
```

---

## ✅ Verify Deployment

### Get Your URL

In Render dashboard:
1. Click on your web service (`routing-service`)
2. Look for the URL at the top (e.g., `routing-service-abc123.onrender.com`)

### Test API

```bash
curl https://routing-service-abc123.onrender.com/api/health
```

**Expected:**
```json
{"status":"healthy","timestamp":"..."}
```

### Open Dashboard

Go to: `https://routing-service-abc123.onrender.com`

You should see the **Intelligent Routing Dashboard**! 🎉

---

## 💰 Pricing for 1-4 Users

**Render Pricing:**
- **Web Service (Starter)**: $7/month
- **PostgreSQL (Free tier)**: $0/month (1GB storage - perfect for you!)

**Total: $7/month** 💵

**Free Tier Option:**
- You can use Free tier for web service too (spins down after inactivity)
- Good for testing, but I recommend Starter for production

---

## 🔄 Auto-Deploy

Once set up, any push to your branch automatically triggers deployment!

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin claude/intelligent-routing-service-011CUM2Tizir16Z1wrYo3KCY

# Render automatically deploys! ✨
```

---

## 🔒 Custom Domain (Optional)

1. In Render dashboard, click your web service
2. Go to **Settings** → **Custom Domains**
3. Click **"Add Custom Domain"**
4. Enter your domain (e.g., `routing.yourdomain.com`)
5. Add CNAME record to your DNS:
   ```
   routing CNAME routing-service-abc123.onrender.com
   ```
6. Render automatically provisions SSL certificate!

---

## 📊 Monitoring

Render dashboard shows:
- **Logs** - Real-time application logs
- **Metrics** - CPU, Memory, Request count
- **Events** - Deployment history

Access logs:
1. Click your web service
2. Click **"Logs"** tab
3. See real-time logs!

---

## 🐛 Troubleshooting

### Build Fails

**Check logs:**
- Dashboard → Service → **Logs** tab

**Common issues:**
- Timeout: Increase instance size in Settings
- Memory: Use larger plan
- Dependencies: Verify package.json

### Application Won't Start

**Check:**
- Environment variables are set correctly
- DATABASE_URL is connected
- PORT is set to 3000

**View runtime logs in dashboard**

### Database Connection Issues

**Verify PostGIS:**
```bash
# Connect to database
psql <CONNECTION_STRING>

# Check PostGIS
SELECT PostGIS_version();
```

---

## ⚡ Performance Tips

1. **Use Starter plan** ($7/month) instead of Free
   - No spin-down delays
   - Better performance
   - Perfect for production

2. **Enable HTTP/2** (automatic on Render)

3. **Use Render's CDN** (automatic)

---

## 🎯 Summary

**Setup Steps:**
1. ✅ Sign up at render.com
2. ✅ Create PostgreSQL database
3. ✅ Enable PostGIS extension
4. ✅ Create web service from GitHub
5. ✅ Add environment variables
6. ✅ Deploy
7. ✅ Run database schema
8. ✅ Done!

**Time:** 10-15 minutes
**Cost:** $7/month
**Complexity:** Very Low
**Perfect for:** 1-4 users

---

## 🆚 Comparison

| Platform | Setup Time | Complexity | Cost/Month |
|----------|-----------|------------|------------|
| **Render** | 10-15 min | ⭐ Easy | $7 |
| Railway | 15-30 min | ⭐⭐ Medium | $5-8 |
| AWS (Scripts) | 15 min | ⭐⭐ Medium | $0-15 |
| AWS (Manual) | 60 min | ⭐⭐⭐⭐ Hard | $0-15 |

**Render = Best balance of easy + affordable!**

---

## 🎉 You're Live!

Your intelligent routing service is now running on Render!

**Features working:**
- ✅ GPS tracking
- ✅ Route optimization
- ✅ Job management
- ✅ Technician management
- ✅ Interactive map
- ✅ Real-time updates

**Perfect for 1-4 users!** 🚀
