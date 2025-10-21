# Deployment Guide

Instructions for deploying the Intelligent Routing Service to production.

## Prerequisites

- Node.js 18+ LTS
- PostgreSQL 14+ with PostGIS
- Nginx or similar reverse proxy
- SSL certificate
- Domain name
- Google Maps API key (optional)

## Production Server Setup

### 1. Server Requirements

**Minimum:**
- 2 CPU cores
- 4 GB RAM
- 20 GB SSD storage
- Ubuntu 20.04+ or similar Linux distribution

**Recommended:**
- 4 CPU cores
- 8 GB RAM
- 50 GB SSD storage

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 14 with PostGIS
sudo apt install -y postgresql-14 postgresql-14-postgis-3

# Install Nginx
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### 3. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE routing_db;
CREATE USER routing_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE routing_db TO routing_user;

# Enable PostGIS
\c routing_db
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
\q

# Run schema migration
psql -U routing_user -d routing_db < /path/to/src/database/schema.sql
```

### 4. Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/routing-service
sudo chown $USER:$USER /var/www/routing-service

# Clone repository
cd /var/www/routing-service
git clone <repository-url> .

# Install dependencies
npm ci --production

# Build application
npm run build

# Install frontend dependencies
cd client
npm ci --production
npm run build
cd ..
```

### 5. Environment Configuration

Create production `.env` file:

```bash
sudo nano /var/www/routing-service/.env
```

```env
# Production Configuration
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=routing_db
DB_USER=routing_user
DB_PASSWORD=secure_password_here

# Google Maps API
GOOGLE_MAPS_API_KEY=your_production_api_key

# CORS
CORS_ORIGIN=https://yourdomain.com

# Routing
MAX_ROUTES_PER_DAY=100
MAX_STOPS_PER_ROUTE=25
DEFAULT_SERVICE_DURATION_MINUTES=60

# GPS Tracking
GPS_UPDATE_INTERVAL_MS=30000
```

Set proper permissions:
```bash
sudo chmod 600 /var/www/routing-service/.env
```

### 6. PM2 Setup

```bash
# Start application with PM2
cd /var/www/routing-service
pm2 start dist/server.js --name routing-service

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the instructions provided by PM2

# Monitor application
pm2 monit
```

### 7. Nginx Configuration

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/routing-service
```

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        root /var/www/routing-service/client/dist;
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

    # WebSocket for GPS tracking
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
}
```

Enable the site:

```bash
# Test configuration
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/routing-service /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Reload Nginx
sudo systemctl reload nginx
```

### 8. SSL Certificate

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 9. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

## Database Backup

### Automated Backups

Create backup script:

```bash
sudo nano /usr/local/bin/backup-routing-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/routing-db"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="routing_db_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U routing_user routing_db | gzip > $BACKUP_DIR/$FILENAME

# Remove backups older than 7 days
find $BACKUP_DIR -name "routing_db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $FILENAME"
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/backup-routing-db.sh
```

Add to crontab:
```bash
sudo crontab -e
```

```cron
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-routing-db.sh
```

## Monitoring

### 1. Application Monitoring

```bash
# View PM2 logs
pm2 logs routing-service

# Monitor resource usage
pm2 monit

# View PM2 dashboard
pm2 web
```

### 2. Database Monitoring

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Monitor active connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Check database size
sudo -u postgres psql routing_db -c "SELECT pg_size_pretty(pg_database_size('routing_db'));"
```

### 3. Nginx Monitoring

```bash
# Check Nginx status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### 4. System Monitoring

Install monitoring tools:

```bash
# Install htop
sudo apt install htop

# Install iotop
sudo apt install iotop

# Install netdata (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

## Scaling

### Horizontal Scaling

For high traffic, consider:

1. **Load Balancer**: Use Nginx or HAProxy
2. **Multiple Application Instances**: Run multiple PM2 instances
3. **Database Replication**: Setup PostgreSQL read replicas
4. **Redis for Caching**: Cache distance matrix and session data
5. **Message Queue**: Use RabbitMQ or Redis for job processing

### Vertical Scaling

Increase server resources:
- More CPU cores for route optimization
- More RAM for caching and concurrent connections
- SSD storage for database performance

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs routing-service --err

# Check environment variables
pm2 show routing-service

# Verify database connection
psql -U routing_user -d routing_db -c "SELECT 1;"
```

### High Memory Usage

```bash
# Restart application
pm2 restart routing-service

# Check for memory leaks
pm2 monit

# Adjust PM2 max memory
pm2 start dist/server.js --name routing-service --max-memory-restart 1G
```

### Slow Route Optimization

- Increase server CPU cores
- Optimize distance matrix caching
- Reduce `MAX_STOPS_PER_ROUTE` constraint
- Add database indexes

### WebSocket Connection Issues

- Check Nginx WebSocket configuration
- Verify firewall allows WebSocket connections
- Check CORS settings
- Monitor Socket.io logs

## Updates and Maintenance

### Update Application

```bash
# Pull latest changes
cd /var/www/routing-service
git pull

# Install dependencies
npm ci --production

# Rebuild application
npm run build

# Rebuild frontend
cd client
npm ci --production
npm run build
cd ..

# Restart application
pm2 restart routing-service
```

### Database Migrations

```bash
# Run new migration
psql -U routing_user -d routing_db < migrations/001_new_feature.sql

# Verify migration
psql -U routing_user -d routing_db -c "\dt"
```

## Security Checklist

- [ ] Use strong database passwords
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall (UFW/iptables)
- [ ] Setup automated backups
- [ ] Enable rate limiting
- [ ] Implement authentication (JWT/OAuth)
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Setup intrusion detection (fail2ban)
- [ ] Use HTTPS only
- [ ] Validate all user inputs
- [ ] Sanitize database queries
- [ ] Setup CORS properly

## Performance Optimization

1. **Database Indexes**: Ensure all geospatial queries use indexes
2. **Connection Pooling**: Configure PostgreSQL connection pool size
3. **Caching**: Implement Redis for frequently accessed data
4. **CDN**: Use CDN for static frontend assets
5. **Compression**: Enable gzip compression in Nginx
6. **HTTP/2**: Enable HTTP/2 in Nginx
7. **Database Tuning**: Optimize PostgreSQL configuration

## Support

For production issues:
- Check logs: `pm2 logs routing-service`
- Monitor metrics: `pm2 monit`
- Review documentation
- Contact support team
