#!/bin/bash
# Deploy Full Routing Application to EC2

set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy-full-app.sh <EC2_PUBLIC_IP>"
    echo "Example: ./deploy-full-app.sh 54.163.10.230"
    exit 1
fi

EC2_IP=$1
KEY_FILE="${KEY_PAIR_NAME:-routing-app-key}.pem"
DB_PASSWORD="${DB_PASSWORD:-RoutingApp2025!}"
REPO_URL="https://github.com/moemeyer/schedule.git"
BRANCH="claude/intelligent-routing-service-011CUM2Tizir16Z1wrYo3KCY"

echo "🚀 Deploying Full Routing Application to ${EC2_IP}..."
echo ""

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Error: Key file $KEY_FILE not found"
    exit 1
fi

# Wait for SSH to be ready
echo "⏳ Waiting for SSH access..."
for i in {1..30}; do
    if ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@${EC2_IP} "echo 'SSH ready'" &>/dev/null; then
        echo "✅ SSH connection established"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ SSH connection timeout"
        exit 1
    fi
    sleep 2
done

# Create deployment script
cat > /tmp/deploy-routing-app.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "📦 Setting up PostgreSQL..."

# Configure PostgreSQL
sudo -u postgres psql << 'EOF' || echo "Database may already exist"
CREATE DATABASE routing_db;
CREATE USER routing_user WITH ENCRYPTED PASSWORD 'REPLACE_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE routing_db TO routing_user;
\c routing_db
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL ON SCHEMA public TO routing_user;
ALTER DATABASE routing_db OWNER TO routing_user;
EOF

echo "✅ PostgreSQL configured"

# Stop any running app
pm2 delete routing-app 2>/dev/null || true
pm2 delete routing-service 2>/dev/null || true

# Remove old deployment
rm -rf ~/schedule ~/server.js ~/package.json

# Clone repository
echo "📥 Cloning repository..."
git clone -b REPLACE_BRANCH REPLACE_REPO_URL ~/schedule
cd ~/schedule

echo "📦 Installing backend dependencies..."
npm ci

echo "🏗️ Building backend..."
npm run build

echo "📦 Installing frontend dependencies..."
cd client
npm ci

echo "🏗️ Building frontend..."
npm run build
cd ..

# Create .env file
echo "⚙️ Creating environment configuration..."
cat > .env << 'ENV_FILE'
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=routing_db
DB_USER=routing_user
DB_PASSWORD=REPLACE_DB_PASSWORD
CORS_ORIGIN=*
MAX_ROUTES_PER_DAY=50
MAX_STOPS_PER_ROUTE=25
DEFAULT_SERVICE_DURATION_MINUTES=60
GPS_UPDATE_INTERVAL_MS=30000
ENV_FILE

# Run database migrations
echo "🗄️ Running database migrations..."
export PGPASSWORD='REPLACE_DB_PASSWORD'
psql -h localhost -U routing_user -d routing_db < src/database/schema.sql

echo "🚀 Starting application with PM2..."
pm2 start dist/server.js --name routing-app
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/routing-app > /dev/null << 'NGINX_CONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Frontend (React app)
    location / {
        root /home/ubuntu/schedule/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket for GPS tracking
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
NGINX_CONF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/routing-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "Application URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "PM2 Status:"
pm2 status

DEPLOY_SCRIPT

# Replace placeholders
sed -i "s|REPLACE_DB_PASSWORD|${DB_PASSWORD}|g" /tmp/deploy-routing-app.sh
sed -i "s|REPLACE_REPO_URL|${REPO_URL}|g" /tmp/deploy-routing-app.sh
sed -i "s|REPLACE_BRANCH|${BRANCH}|g" /tmp/deploy-routing-app.sh

# Copy and execute
echo "📤 Uploading deployment script..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no /tmp/deploy-routing-app.sh ubuntu@${EC2_IP}:/home/ubuntu/

echo "🚀 Executing deployment..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ubuntu@${EC2_IP} "chmod +x /home/ubuntu/deploy-routing-app.sh && /home/ubuntu/deploy-routing-app.sh"

echo ""
echo "============================================"
echo "✅ Full Routing Application Deployed!"
echo "============================================"
echo ""
echo "Dashboard: http://${EC2_IP}"
echo "API Health: http://${EC2_IP}/api/health"
echo ""
echo "Test with:"
echo "  curl http://${EC2_IP}/api/health"
echo ""
