# ⚡ Quick Start - Deploy to AWS in 5 Minutes

**For 1-4 users | FREE for 12 months with AWS Free Tier**

## Prerequisites
- ✅ AWS account (you have this)
- ✅ AWS CLI configured (you have this)

## 🚀 Fastest Deployment (Copy & Paste)

### Option 1: Automated Scripts (Recommended)

```bash
# Step 1: Make scripts executable
chmod +x aws-deploy.sh deploy-app.sh

# Step 2: Deploy infrastructure
./aws-deploy.sh

# Step 3: Wait 2-3 minutes, then deploy app (use the IP from step 2)
./deploy-app.sh <YOUR_PUBLIC_IP>

# Done! Open http://<YOUR_PUBLIC_IP> in your browser
```

**Total time: ~8-10 minutes**

---

### Option 2: CloudFormation (One Command)

```bash
# Create key pair first (if you don't have one)
aws ec2 create-key-pair \
  --key-name routing-keypair \
  --query 'KeyMaterial' \
  --output text > routing-keypair.pem && \
chmod 400 routing-keypair.pem

# Deploy everything
aws cloudformation create-stack \
  --stack-name routing-service \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=routing-keypair \
    ParameterKey=DBPassword,ParameterValue=$(openssl rand -base64 12) \
    ParameterKey=InstanceType,ParameterValue=t3.micro

# Wait for completion (~10-15 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name routing-service

# Get your URL
aws cloudformation describe-stacks \
  --stack-name routing-service \
  --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' \
  --output text
```

**Total time: ~15 minutes (fully automated)**

---

## 📋 What Gets Created

- **EC2 Instance**: t3.micro (FREE tier eligible)
- **PostgreSQL + PostGIS**: Running on EC2
- **Backend**: Node.js server with Socket.io
- **Frontend**: React dashboard
- **Nginx**: Reverse proxy

---

## 💰 Cost for 1-4 Users

- **First 12 months**: $0 (FREE tier)
- **After 12 months**: ~$12-15/month
- **With Reserved Instance**: ~$7/month

---

## ✅ Verify It Works

```bash
# Get your public IP from deployment output

# Test API
curl http://<YOUR_IP>/api/health

# Open in browser
open http://<YOUR_IP>
```

---

## 🔧 Manage Your Instance

```bash
# SSH into instance
ssh -i routing-keypair.pem ubuntu@<YOUR_IP>

# Check application status
pm2 status

# View logs
pm2 logs routing-service

# Restart app
pm2 restart routing-service
```

---

## 🛑 Stop Instance (Save Money)

```bash
# Stop instance when not in use
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Start instance when needed
aws ec2 start-instances --instance-ids <INSTANCE_ID>

# Get new public IP after start
aws ec2 describe-instances \
  --instance-ids <INSTANCE_ID> \
  --query 'Reservations[0].Instances[0].PublicIpAddress'
```

---

## 📚 Need More Details?

- **Full Guide**: See `AWS_DEPLOYMENT_GUIDE.md`
- **Platform Comparison**: See `DEPLOYMENT_PLATFORMS.md`
- **General Deployment**: See `DEPLOYMENT.md`

---

## 🚨 Troubleshooting

**Can't SSH?**
- Check security group allows port 22
- Verify key file permissions: `chmod 400 routing-keypair.pem`

**Application not working?**
```bash
ssh -i routing-keypair.pem ubuntu@<YOUR_IP>
pm2 logs routing-service
```

**Port 80 not accessible?**
- Check security group allows port 80
- Check Nginx: `sudo systemctl status nginx`

---

## 🎉 You're Done!

Your routing service is live on AWS!

**Dashboard**: http://<YOUR_IP>

For 1-4 users, this setup is perfect and likely **completely FREE** for 12 months! 🚀
