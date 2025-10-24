#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./deploy-app.sh <PUBLIC_IP>"
  exit 1
fi

PUBLIC_IP=$1
SSH_KEY="routing-app-key.pem"
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP"

echo "🚀 Deploying application to $PUBLIC_IP..."

# Wait for SSH to be ready
echo "⏳ Waiting for SSH access..."
for i in {1..30}; do
  if $SSH_CMD "echo 'SSH ready'" 2>/dev/null; then
    break
  fi
  sleep 5
done

echo "✓ SSH connection established"

# Upload application files
echo "📤 Uploading application files..."
scp -i $SSH_KEY -o StrictHostKeyChecking=no server.js package.json ubuntu@$PUBLIC_IP:~/
echo "✓ Files uploaded"

# Deploy application
$SSH_CMD << 'ENDSSH'
set -e

echo "📦 Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE routing_app;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER routing_user WITH PASSWORD 'routing_pass';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE routing_app TO routing_user;" 2>/dev/null || true
sudo -u postgres psql -d routing_app -c "CREATE EXTENSION IF NOT EXISTS postgis;"

echo "✓ Database configured"

echo "📥 Setting up application..."

echo "📦 Installing dependencies..."
npm install

echo "🔧 Creating environment file..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://routing_user:routing_pass@localhost:5432/routing_app
EOF

echo "🗄️ Setting up database schema..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://routing_user:routing_pass@localhost:5432/routing_app' });
pool.query(\`
  CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
  );
\`).then(() => { console.log('Schema created'); pool.end(); }).catch(console.error);
"

echo "🚀 Starting application with PM2..."
pm2 delete all 2>/dev/null || true
pm2 start server.js --name routing-app
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -n 1 | sudo bash

echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/default > /dev/null << 'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo systemctl restart nginx

echo "✓ Nginx configured"
ENDSSH

echo ""
echo "✓ Application deployed successfully!"
echo "Dashboard: http://$PUBLIC_IP"
echo "API: http://$PUBLIC_IP/api"
echo "Health Check: http://$PUBLIC_IP/api/health"
echo ""
echo "Test with: curl http://$PUBLIC_IP/api/health"
