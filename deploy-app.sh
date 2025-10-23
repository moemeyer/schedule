#!/bin/bash
# Deploy application to AWS EC2 instance

set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy-app.sh <EC2_PUBLIC_IP>"
    echo "Example: ./deploy-app.sh 3.85.123.45"
    exit 1
fi

EC2_IP=$1
KEY_FILE="${KEY_PAIR_NAME:-routing-keypair}.pem"
DB_PASSWORD="${DB_PASSWORD:-ChangeMeInProduction}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Deploying application to ${EC2_IP}${NC}"
echo ""

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "Error: Key file $KEY_FILE not found"
    exit 1
fi

# Create deployment script to run on EC2
cat > /tmp/remote-setup.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "Starting application deployment..."

# Setup PostgreSQL
echo "Configuring PostgreSQL..."
sudo -u postgres psql << EOF
CREATE DATABASE routing_db;
CREATE USER routing_user WITH ENCRYPTED PASSWORD 'REPLACE_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE routing_db TO routing_user;
\c routing_db
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
GRANT ALL ON SCHEMA public TO routing_user;
EOF

echo "PostgreSQL configured!"

# Clone repository
if [ ! -d "schedule" ]; then
    echo "Cloning repository..."
    git clone REPLACE_REPO_URL schedule
fi

cd schedule

# Install backend dependencies
echo "Installing backend dependencies..."
npm ci --production

# Install frontend dependencies and build
echo "Building frontend..."
cd client
npm ci --production
npm run build
cd ..

# Build backend
echo "Building backend..."
npm run build

# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=routing_db
DB_USER=routing_user
DB_PASSWORD=REPLACE_DB_PASSWORD
GOOGLE_MAPS_API_KEY=
CORS_ORIGIN=*
MAX_ROUTES_PER_DAY=50
MAX_STOPS_PER_ROUTE=25
DEFAULT_SERVICE_DURATION_MINUTES=60
GPS_UPDATE_INTERVAL_MS=30000
EOF

# Run database migrations
echo "Running database migrations..."
PGPASSWORD='REPLACE_DB_PASSWORD' psql -h localhost -U routing_user -d routing_db < src/database/schema.sql

# Optional: Load seed data
read -p "Load sample seed data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    PGPASSWORD='REPLACE_DB_PASSWORD' psql -h localhost -U routing_user -d routing_db < src/database/seed.sql
fi

# Start application with PM2
echo "Starting application..."
pm2 delete routing-service 2>/dev/null || true
pm2 start dist/server.js --name routing-service
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Configure Nginx
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/routing-service << 'NGINX'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /home/ubuntu/schedule/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/routing-service /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "============================================"
echo "Deployment Complete!"
echo "============================================"
echo ""
echo "Application is running at:"
echo "http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "To check status:"
echo "  pm2 status"
echo "  pm2 logs routing-service"
echo ""
SCRIPT

# Replace placeholders
sed -i "s|REPLACE_DB_PASSWORD|$DB_PASSWORD|g" /tmp/remote-setup.sh
sed -i "s|REPLACE_REPO_URL|https://github.com/moemeyer/schedule.git|g" /tmp/remote-setup.sh

# Copy script to EC2
echo -e "${YELLOW}Copying deployment script to EC2...${NC}"
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no /tmp/remote-setup.sh ubuntu@${EC2_IP}:/home/ubuntu/

# Execute deployment
echo -e "${YELLOW}Executing deployment on EC2...${NC}"
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ubuntu@${EC2_IP} "chmod +x /home/ubuntu/remote-setup.sh && /home/ubuntu/remote-setup.sh"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Application URL: ${GREEN}http://${EC2_IP}${NC}"
echo ""
echo -e "To SSH into your instance:"
echo -e "${GREEN}ssh -i ${KEY_FILE} ubuntu@${EC2_IP}${NC}"
echo ""
echo -e "To check application status:"
echo -e "${GREEN}ssh -i ${KEY_FILE} ubuntu@${EC2_IP} 'pm2 status'${NC}"
echo ""
