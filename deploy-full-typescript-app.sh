#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: ./deploy-full-typescript-app.sh <PUBLIC_IP>"
  echo ""
  echo "Environment overrides:"
  echo "  SSH_KEY      path to the SSH private key        (default: routing-app-key.pem)"
  echo "  SSH_USER     remote user                        (default: ubuntu)"
  echo "  DB_PASSWORD  password for the routing_user role (default: randomly generated)"
  exit 1
fi

PUBLIC_IP=$1
SSH_KEY="${SSH_KEY:-routing-app-key.pem}"
SSH_USER="${SSH_USER:-ubuntu}"
GITHUB_REPO="https://github.com/moemeyer/schedule.git"
BRANCH="routing-app-full"
APP_DIR="routing-app"

# Fail fast on a missing key instead of burning 30 confusing SSH retries.
if [ ! -r "$SSH_KEY" ]; then
  echo "❌ ERROR: SSH key not found or not readable: $SSH_KEY"
  echo "   Pass a different path with SSH_KEY=/path/to/key.pem"
  exit 1
fi

# accept-new trusts a brand-new host on first contact (required for a freshly
# provisioned instance, which has no entry in known_hosts yet) but still REFUSES
# to connect if a previously-known host key changes — that is the MITM case that
# actually matters. Plain `StrictHostKeyChecking=no` would silently accept a
# changed key; omitting the option entirely would hang on an interactive prompt.
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new ${SSH_USER}@${PUBLIC_IP}"

# Generated per deploy unless supplied. Restricted to alphanumerics so it can be
# embedded in DATABASE_URL without percent-encoding.
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | cut -c1-32)}"

echo "🚀 Deploying Full TypeScript Application to $PUBLIC_IP..."
echo ""

# Wait for SSH to be ready
echo "⏳ Waiting for SSH access..."
SSH_READY=false
for _ in {1..30}; do
  if $SSH_CMD "echo 'SSH ready'" 2>/dev/null; then
    echo "✓ SSH connection established"
    SSH_READY=true
    break
  fi
  sleep 5
done

if [ "$SSH_READY" != true ]; then
  echo "❌ ERROR: could not establish an SSH connection to $PUBLIC_IP after 30 attempts (~150s)."
  echo "   Check that the instance is running, the security group allows port 22, and SSH_KEY is correct."
  exit 1
fi

echo ""
echo "📥 Deploying application..."

# Deploy application
$SSH_CMD << ENDSSH
set -euo pipefail

echo "🔎 Verifying required dependencies..."
for cmd in git npm node pm2 psql nginx; do
  if ! command -v \$cmd >/dev/null 2>&1; then
    echo "❌ ERROR: required dependency '\$cmd' is not installed on this host."
    exit 1
  fi
done
echo "✓ All dependencies present"

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
sudo -u postgres psql -c "DROP DATABASE IF EXISTS routing_app;"
sudo -u postgres psql -c "CREATE DATABASE routing_app;"
# Create the role, or reset its password if a previous deploy already created it,
# so the credentials always match the DATABASE_URL written below.
sudo -u postgres psql -c "CREATE USER routing_user WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null \
  || sudo -u postgres psql -c "ALTER USER routing_user WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE routing_app TO routing_user;"

echo "📊 Creating database schema with PostGIS..."
sudo -u postgres psql -d routing_app < src/db/schema.sql

echo "🔧 Creating environment file..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://routing_user:$DB_PASSWORD@localhost:5432/routing_app
CORS_ORIGIN=*
EOF
chmod 600 .env

echo "🚀 Starting application with PM2..."
pm2 start dist/server.js --name routing-app --time
pm2 save
pm2 startup systemd -u $SSH_USER --hp /home/$SSH_USER 2>/dev/null | tail -n 1 | sudo bash || true

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
echo "  ssh -i $SSH_KEY ${SSH_USER}@$PUBLIC_IP"
echo ""
echo "📊 View logs:"
echo "  pm2 logs routing-app"
echo ""
echo "🔐 The database password was generated for this deploy and written to"
echo "   ~/$APP_DIR/.env (mode 600) on the host. Set DB_PASSWORD=... to pin it."
echo ""
