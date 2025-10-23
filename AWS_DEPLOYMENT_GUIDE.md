# AWS Deployment Guide - Intelligent Routing Service

Complete guide to deploy your routing service on AWS. **For 1-4 users, this will likely be FREE (within AWS Free Tier)!**

## 🎯 What You'll Deploy

- **EC2 Instance**: t3.micro (Free Tier eligible) running Ubuntu 22.04
- **PostgreSQL + PostGIS**: Installed on the EC2 instance
- **Backend**: Node.js + Express + Socket.io
- **Frontend**: React app served by Nginx
- **Estimated Cost**: $0-$10/month (Free Tier for 12 months, then ~$8-15/month)

---

## Prerequisites

1. **AWS Account** - You already have this ✅
2. **AWS CLI configured** - You mentioned this is set up ✅
3. **Git repository** - Your code is on GitHub ✅

To verify AWS CLI:
```bash
aws --version
aws sts get-caller-identity
```

---

## 🚀 Option 1: Automated Deployment (EASIEST - Recommended)

### Step 1: Make Scripts Executable

```bash
chmod +x aws-deploy.sh deploy-app.sh
```

### Step 2: Run Infrastructure Setup

```bash
./aws-deploy.sh
```

**What this does:**
- ✅ Creates SSH key pair
- ✅ Creates security group
- ✅ Launches EC2 instance (t3.micro)
- ✅ Installs Node.js, PostgreSQL, Nginx
- ✅ Saves deployment info

**Time:** ~3-5 minutes

The script will output:
```
Instance ID: i-0abc123def456
Public IP: 3.85.123.45
SSH Command: ssh -i routing-keypair.pem ubuntu@3.85.123.45
```

### Step 3: Wait for Initialization

Wait 2-3 minutes for the instance to fully initialize.

### Step 4: Deploy Application

```bash
./deploy-app.sh <PUBLIC_IP>
```

Replace `<PUBLIC_IP>` with the IP from step 2.

Example:
```bash
./deploy-app.sh 3.85.123.45
```

**What this does:**
- ✅ Configures PostgreSQL database
- ✅ Clones your repository
- ✅ Installs dependencies
- ✅ Builds backend and frontend
- ✅ Runs database migrations
- ✅ Starts application with PM2
- ✅ Configures Nginx reverse proxy

**Time:** ~5-10 minutes

### Step 5: Access Your Application

Open your browser to: `http://<PUBLIC_IP>`

**Done!** 🎉

---

## 🏗️ Option 2: CloudFormation (Infrastructure as Code)

### Step 1: Create Key Pair (if you don't have one)

```bash
aws ec2 create-key-pair \
  --key-name routing-keypair \
  --region us-east-1 \
  --query 'KeyMaterial' \
  --output text > routing-keypair.pem

chmod 400 routing-keypair.pem
```

### Step 2: Deploy CloudFormation Stack

```bash
aws cloudformation create-stack \
  --stack-name routing-service \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=routing-keypair \
    ParameterKey=DBPassword,ParameterValue=YourSecurePassword123 \
    ParameterKey=InstanceType,ParameterValue=t3.micro \
  --region us-east-1
```

### Step 3: Monitor Stack Creation

```bash
aws cloudformation wait stack-create-complete \
  --stack-name routing-service \
  --region us-east-1
```

**Time:** ~10-15 minutes (everything is automated!)

### Step 4: Get Public IP

```bash
aws cloudformation describe-stacks \
  --stack-name routing-service \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

This will show you:
- Public IP
- Application URL
- SSH command

### Step 5: Access Application

Open browser to the Application URL from the output.

**Done!** 🎉

---

## 📋 Manual Step-by-Step (If you want full control)

### 1. Create Security Group

```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)

# Create security group
SG_ID=$(aws ec2 create-security-group \
  --group-name routing-service-sg \
  --description "Security group for routing service" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Add rules
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
```

### 2. Launch EC2 Instance

```bash
# Get latest Ubuntu AMI
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.micro \
  --key-name routing-keypair \
  --security-group-ids $SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=routing-service}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

# Wait for it to run
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "Instance running at: $PUBLIC_IP"
```

### 3. SSH and Setup

```bash
ssh -i routing-keypair.pem ubuntu@$PUBLIC_IP
```

Once connected, run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL + PostGIS
sudo apt install -y postgresql-14 postgresql-14-postgis-3

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Setup database
sudo -u postgres psql << 'EOF'
CREATE DATABASE routing_db;
CREATE USER routing_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE routing_db TO routing_user;
\c routing_db
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
GRANT ALL ON SCHEMA public TO routing_user;
EOF

# Clone repository
git clone https://github.com/moemeyer/schedule.git
cd schedule

# Install and build
npm ci --production
npm run build

cd client
npm ci --production
npm run build
cd ..

# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=routing_db
DB_USER=routing_user
DB_PASSWORD=your_secure_password
GOOGLE_MAPS_API_KEY=
CORS_ORIGIN=*
EOF

# Run migrations
PGPASSWORD='your_secure_password' psql -h localhost -U routing_user -d routing_db < src/database/schema.sql

# Optional: Load sample data
PGPASSWORD='your_secure_password' psql -h localhost -U routing_user -d routing_db < src/database/seed.sql

# Start with PM2
pm2 start dist/server.js --name routing-service
pm2 save
pm2 startup

# Configure Nginx
sudo tee /etc/nginx/sites-available/routing-service << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /home/ubuntu/schedule/client/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/routing-service /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Verification

### Check if everything is running:

```bash
# SSH into your instance
ssh -i routing-keypair.pem ubuntu@<PUBLIC_IP>

# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs routing-service

# Check Nginx status
sudo systemctl status nginx

# Check database
psql -U routing_user -d routing_db -c "SELECT COUNT(*) FROM technicians;"
```

### Test the application:

```bash
# Test API health
curl http://<PUBLIC_IP>/api/health

# Should return: {"status":"healthy","timestamp":"..."}
```

### Open in browser:

```
http://<PUBLIC_IP>
```

You should see the Intelligent Routing Dashboard!

---

## 🔒 Security Improvements (Recommended)

### 1. Restrict SSH Access

```bash
# Only allow your IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

aws ec2 revoke-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 22 --cidr ${MY_IP}/32
```

### 2. Use Elastic IP (Static IP)

```bash
# Allocate Elastic IP
EIP_ALLOC=$(aws ec2 allocate-address --query 'AllocationId' --output text)

# Associate with instance
aws ec2 associate-address \
  --instance-id $INSTANCE_ID \
  --allocation-id $EIP_ALLOC
```

### 3. Setup SSL/HTTPS (with Let's Encrypt)

```bash
# SSH into instance
ssh -i routing-keypair.pem ubuntu@<PUBLIC_IP>

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

---

## 📊 Monitoring

### CloudWatch Monitoring

```bash
# View CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### Application Logs

```bash
# SSH into instance
ssh -i routing-keypair.pem ubuntu@<PUBLIC_IP>

# View PM2 logs
pm2 logs routing-service

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 💰 Cost Breakdown (1-4 users)

### Free Tier (First 12 months):
- EC2 t3.micro: **FREE** (750 hours/month)
- EBS Storage: **FREE** (30GB)
- Data Transfer: **FREE** (15GB out/month)
- **Total: $0/month** ✨

### After Free Tier:
- EC2 t3.micro: ~$8/month
- EBS Storage (30GB): ~$3/month
- Data Transfer: ~$1-2/month (for your usage)
- **Total: ~$12-15/month** 💵

### To minimize costs:
- ✅ Use t3.micro (cheapest option that works)
- ✅ Stop instance when not in use (saves ~70%)
- ✅ Use Reserved Instances (saves ~40% if running 24/7)

---

## 🔄 Updates and Maintenance

### Update Application Code

```bash
# SSH into instance
ssh -i routing-keypair.pem ubuntu@<PUBLIC_IP>

cd schedule
git pull
npm ci --production
npm run build

cd client
npm ci --production
npm run build
cd ..

# Restart application
pm2 restart routing-service
```

### Backup Database

```bash
# Create backup
pg_dump -U routing_user routing_db > backup.sql

# Download backup to local machine
scp -i routing-keypair.pem ubuntu@<PUBLIC_IP>:~/backup.sql ./
```

### Restore Database

```bash
psql -U routing_user routing_db < backup.sql
```

---

## 🚨 Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs routing-service --err

# Check database connection
psql -U routing_user -d routing_db

# Check .env file
cat .env
```

### Can't access website

```bash
# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check if port 80 is open
sudo netstat -tlnp | grep :80

# Check security group
aws ec2 describe-security-groups --group-ids $SG_ID
```

### Database errors

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 🎓 Next Steps

1. **Add Your Google Maps API Key** to `.env` for distance calculations
2. **Set up domain name** and SSL certificate
3. **Configure backups** (automated daily backups)
4. **Set up monitoring alerts** (CloudWatch alarms)
5. **Create IAM user** with limited permissions instead of root

---

## 📞 Support

If you run into issues:

1. Check PM2 logs: `pm2 logs routing-service`
2. Check the `TEST_REPORT.md` for known limitations
3. Review the `DEPLOYMENT.md` for general deployment info
4. Check AWS CloudWatch for instance health

---

## 🎉 Success!

Your Intelligent Routing Service is now running on AWS!

**Access your application:**
- Dashboard: `http://<YOUR_PUBLIC_IP>`
- API: `http://<YOUR_PUBLIC_IP>/api/health`

**For 1-4 users, you're perfectly set up and likely within the FREE tier!** 🚀
