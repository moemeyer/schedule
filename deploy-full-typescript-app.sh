#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./deploy-full-typescript-app.sh <PUBLIC_IP>"
  exit 1
fi

PUBLIC_IP=$1
SSH_KEY="routing-app-key.pem"
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP"
GITHUB_REPO="https://github.com/moemeyer/schedule.git"
BRANCH="routing-app-full"
APP_DIR="routing-app"

echo "🚀 Deploying Full TypeScript Application to $PUBLIC_IP..."
echo ""

# Wait for SSH to be ready
echo "⏳ Waiting for SSH access..."
for i in {1..30}; do
  if $SSH_CMD "echo 'SSH ready'" 2>/dev/null; then
    echo "✓ SSH connection established"
    break
  fi
  sleep 5
done

echo ""
echo "📥 Deploying application..."

# Deploy application
$SSH_CMD << ENDSSH
set -e

echo "🗑️  Cleaning up old deployment..."
pm2 delete all 2>/dev/null || true
rm -rf ~/$APP_DIR

echo "📦 Cloning repository from GitHub..."
git clone -b $BRANCH $GITHUB_REPO ~/$APP_DIR
cd ~/$APP_DIR

echo "📥 Installing dependencies..."
npm install

echo "🔨 Building TypeScript application..."
npm run build

echo "🗄️  Configuring PostgreSQL database..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS routing_app;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE routing_app;"
sudo -u postgres psql -c "CREATE USER routing_user WITH PASSWORD 'routing_pass';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE routing_app TO routing_user;"

echo "📊 Creating database schema with PostGIS..."
sudo -u postgres psql -d routing_app < src/db/schema.sql

echo "🔧 Creating environment file..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://routing_user:routing_pass@localhost:5432/routing_app
CORS_ORIGIN=*
EOF

echo "🚀 Starting application with PM2..."
pm2 start dist/server.js --name routing-app --time
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null | tail -n 1 | sudo bash || true

echo "🌐 Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/default > /dev/null << 'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "✅ Application deployed successfully!"
echo "📊 PM2 Status:"
pm2 status

ENDSSH

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Application URL: http://$PUBLIC_IP"
echo ""
echo "📡 API Endpoints:"
echo "  • Health Check:  http://$PUBLIC_IP/api/health"
echo "  • Technicians:   http://$PUBLIC_IP/api/technicians"
echo "  • Jobs:          http://$PUBLIC_IP/api/jobs"
echo ""
echo "🧪 Test Commands:"
echo "  curl http://$PUBLIC_IP/api/health"
echo "  curl http://$PUBLIC_IP/api/technicians"
echo "  curl http://$PUBLIC_IP/api/jobs"
echo ""
echo "🔍 SSH into server:"
echo "  ssh -i $SSH_KEY ubuntu@$PUBLIC_IP"
echo ""
echo "📊 View logs:"
echo "  pm2 logs routing-app"
echo ""
