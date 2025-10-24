#!/bin/bash
set -e

echo "🚀 Creating AWS infrastructure..."

# Create security group
SG_ID=$(aws ec2 create-security-group \
  --group-name routing-app-sg \
  --description "Security group for routing application" \
  --query 'GroupId' \
  --output text 2>/dev/null || aws ec2 describe-security-groups \
  --group-names routing-app-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

echo "✓ Security group: $SG_ID"

# Add security group rules
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0 2>/dev/null || true

echo "✓ Security group rules configured"

# Create key pair
if [ ! -f routing-app-key.pem ]; then
  aws ec2 create-key-pair \
    --key-name routing-app-key \
    --query 'KeyMaterial' \
    --output text > routing-app-key.pem
  chmod 400 routing-app-key.pem
  echo "✓ SSH key created: routing-app-key.pem"
else
  echo "✓ Using existing SSH key: routing-app-key.pem"
fi

# User data script
USER_DATA=$(cat <<'EOF'
#!/bin/bash
apt-get update
apt-get install -y curl git nginx postgresql postgresql-contrib postgis

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Configure PostgreSQL
systemctl start postgresql
systemctl enable postgresql

echo "Setup complete" > /tmp/init-complete
EOF
)

# Launch EC2 instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id \
  --instance-type t2.micro \
  --key-name routing-app-key \
  --security-group-ids $SG_ID \
  --user-data "$USER_DATA" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=routing-app}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "✓ EC2 instance launching: $INSTANCE_ID"
echo "⏳ Waiting for instance to be running..."

aws ec2 wait instance-running --instance-ids $INSTANCE_ID

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo ""
echo "✓ Deployment complete!"
echo "Public IP: $PUBLIC_IP"
echo "SSH Command: ssh -i routing-app-key.pem ubuntu@$PUBLIC_IP"
echo ""
echo "⏳ Wait 2-3 minutes for initialization, then run:"
echo "./deploy-app.sh $PUBLIC_IP"
