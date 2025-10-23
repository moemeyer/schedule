#!/bin/bash
# AWS Deployment Script for Intelligent Routing Service
# For 1-4 users - Uses AWS Free Tier where possible

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="routing-service"
REGION="${AWS_REGION:-us-east-1}"
KEY_PAIR_NAME="${KEY_PAIR_NAME:-routing-keypair}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}AWS Deployment - Routing Service${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ Connected to AWS Account: ${ACCOUNT_ID}${NC}"
echo ""

# Create key pair if it doesn't exist
echo -e "${YELLOW}Checking for SSH key pair...${NC}"
if ! aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$REGION" &> /dev/null; then
    echo -e "${YELLOW}Creating new key pair: ${KEY_PAIR_NAME}${NC}"
    aws ec2 create-key-pair \
        --key-name "$KEY_PAIR_NAME" \
        --region "$REGION" \
        --query 'KeyMaterial' \
        --output text > "${KEY_PAIR_NAME}.pem"
    chmod 400 "${KEY_PAIR_NAME}.pem"
    echo -e "${GREEN}✓ Key pair created and saved to ${KEY_PAIR_NAME}.pem${NC}"
else
    echo -e "${GREEN}✓ Key pair already exists${NC}"
fi
echo ""

# Create security group
echo -e "${YELLOW}Creating security group...${NC}"
VPC_ID=$(aws ec2 describe-vpcs --region "$REGION" --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)

SG_ID=$(aws ec2 create-security-group \
    --group-name "${APP_NAME}-sg" \
    --description "Security group for routing service" \
    --vpc-id "$VPC_ID" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=${APP_NAME}-sg" \
        --region "$REGION" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)

echo -e "${GREEN}✓ Security Group ID: ${SG_ID}${NC}"

# Add security group rules
echo -e "${YELLOW}Configuring security group rules...${NC}"
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 22 --cidr 0.0.0.0/0 \
    --region "$REGION" 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 80 --cidr 0.0.0.0/0 \
    --region "$REGION" 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 443 --cidr 0.0.0.0/0 \
    --region "$REGION" 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 3000 --cidr 0.0.0.0/0 \
    --region "$REGION" 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 5432 --cidr 0.0.0.0/0 \
    --region "$REGION" 2>/dev/null || true

echo -e "${GREEN}✓ Security group configured${NC}"
echo ""

# Launch EC2 instance
echo -e "${YELLOW}Launching EC2 instance (t3.micro - Free Tier eligible)...${NC}"

# Get latest Ubuntu AMI
AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --region "$REGION" \
    --output text)

echo -e "Using AMI: ${AMI_ID}"

# Create user data script
cat > user-data.sh << 'EOF'
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PostgreSQL 14 with PostGIS
apt-get install -y postgresql-14 postgresql-14-postgis-3

# Install Nginx
apt-get install -y nginx

# Install Git
apt-get install -y git

# Install PM2
npm install -g pm2

echo "Setup complete!"
EOF

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type t3.micro \
    --key-name "$KEY_PAIR_NAME" \
    --security-group-ids "$SG_ID" \
    --user-data file://user-data.sh \
    --region "$REGION" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${APP_NAME}}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo -e "${GREEN}✓ EC2 Instance launched: ${INSTANCE_ID}${NC}"
echo -e "${YELLOW}Waiting for instance to be running...${NC}"

aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo -e "${GREEN}✓ Instance is running${NC}"
echo -e "${GREEN}✓ Public IP: ${PUBLIC_IP}${NC}"
echo ""

# Save deployment info
cat > deployment-info.txt << EOF
AWS Deployment Information
==========================

Instance ID: ${INSTANCE_ID}
Public IP: ${PUBLIC_IP}
Region: ${REGION}
Security Group: ${SG_ID}
Key Pair: ${KEY_PAIR_NAME}
DB Password: ${DB_PASSWORD}

SSH Access:
ssh -i ${KEY_PAIR_NAME}.pem ubuntu@${PUBLIC_IP}

Next Steps:
1. Wait 2-3 minutes for instance initialization
2. SSH into the instance
3. Clone your repository
4. Set up PostgreSQL database
5. Configure and run the application

Or run: ./deploy-app.sh ${PUBLIC_IP}
EOF

cat deployment-info.txt

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo -e "1. Deployment info saved to: ${GREEN}deployment-info.txt${NC}"
echo -e "2. SSH key saved to: ${GREEN}${KEY_PAIR_NAME}.pem${NC}"
echo -e "3. Keep the DB password safe: ${GREEN}${DB_PASSWORD}${NC}"
echo ""
echo -e "${YELLOW}To deploy the application:${NC}"
echo -e "Wait 2-3 minutes for initialization, then run:"
echo -e "${GREEN}./deploy-app.sh ${PUBLIC_IP}${NC}"
echo ""
echo -e "Or SSH manually:"
echo -e "${GREEN}ssh -i ${KEY_PAIR_NAME}.pem ubuntu@${PUBLIC_IP}${NC}"
