# 🚀 SmartNotes Production Deployment Guide

This guide provides step-by-step instructions for deploying SmartNotes to production with enterprise-grade security, scalability, and monitoring.

## 📋 Prerequisites

### **System Requirements**
- **Server**: Ubuntu 20.04+ LTS or CentOS 8+
- **CPU**: 4+ cores (8+ recommended for production)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 100GB+ SSD
- **Network**: Static IP with domain name

### **Required Services**
- **Domain**: Registered domain with DNS control
- **SSL Certificate**: Let's Encrypt or commercial SSL
- **Email Service**: SendGrid, AWS SES, or SMTP server
- **Payment Processing**: Stripe account
- **Monitoring**: Sentry account (optional)
- **CDN**: CloudFlare or AWS CloudFront (optional)

---

## 🔧 Server Setup

### **1. Initial Server Configuration**

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for migrations and scripts)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create application directory
sudo mkdir -p /opt/smartnotes-production
sudo chown $USER:$USER /opt/smartnotes-production
```

### **2. Firewall Configuration**

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### **3. SSL Certificate Setup**

```bash
# Install Certbot for Let's Encrypt
sudo apt install -y certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d smartnotes.app -d www.smartnotes.app -d api.smartnotes.app

# Create SSL directory for Docker
sudo mkdir -p /opt/smartnotes-production/nginx/ssl
sudo cp /etc/letsencrypt/live/smartnotes.app/fullchain.pem /opt/smartnotes-production/nginx/ssl/smartnotes.crt
sudo cp /etc/letsencrypt/live/smartnotes.app/privkey.pem /opt/smartnotes-production/nginx/ssl/smartnotes.key
sudo chown -R $USER:$USER /opt/smartnotes-production/nginx/ssl
```

---

## 📦 Application Deployment

### **1. Clone Repository**

```bash
cd /opt/smartnotes-production
git clone https://github.com/FrancKINANI/smart_notes.git .
```

### **2. Environment Configuration**

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit environment variables
nano .env.production
```

**Required Environment Variables:**
```env
# Application
NODE_ENV=production
PORT=5000
APP_URL=https://smartnotes.app
CLIENT_URL=https://smartnotes.app
API_URL=https://api.smartnotes.app

# Database (use managed database service)
DATABASE_URL=mysql://username:password@db-host:3306/smartnotes_prod

# Redis (use managed Redis service)
REDIS_URL=redis://username:password@redis-host:6379

# Security
SESSION_SECRET=your-super-secure-session-secret-min-32-chars
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-jwt-refresh-secret-min-32-chars
ENCRYPTION_KEY=your-32-byte-encryption-key

# External Services
OPENAI_API_KEY=your-openai-api-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@smartnotes.app

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

### **3. Database Setup**

```bash
# Install dependencies
npm ci --only=production

# Run database migrations
npm run migrate

# Seed initial data (optional)
npm run seed:production
```

### **4. Build Application**

```bash
# Build the application
npm run build

# Build Docker image
docker build -t smartnotes:latest .
```

---

## 🐳 Docker Deployment

### **1. Start Services**

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f app
```

### **2. Health Checks**

```bash
# Check application health
curl -f https://smartnotes.app/health

# Check API health
curl -f https://api.smartnotes.app/health

# Check database connection
docker-compose -f docker-compose.production.yml exec app npm run health:db
```

---

## 🔒 Security Configuration

### **1. SSL/TLS Setup**

```bash
# Test SSL configuration
openssl s_client -connect smartnotes.app:443 -servername smartnotes.app

# Check SSL rating
curl -s "https://api.ssllabs.com/api/v3/analyze?host=smartnotes.app" | jq '.status'
```

### **2. Security Headers**

Verify security headers are properly set:
```bash
curl -I https://smartnotes.app | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"
```

### **3. Firewall Rules**

```bash
# Additional security rules
sudo ufw deny from 192.168.0.0/16 to any port 22
sudo ufw deny from 10.0.0.0/8 to any port 22
sudo ufw deny from 172.16.0.0/12 to any port 22
```

---

## 📊 Monitoring Setup

### **1. Application Monitoring**

```bash
# Start monitoring stack (optional)
docker-compose -f docker-compose.production.yml --profile monitoring up -d

# Access Grafana dashboard
# URL: https://smartnotes.app:3000
# Default: admin/admin (change immediately)
```

### **2. Log Management**

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/smartnotes

# Add log rotation configuration:
/opt/smartnotes-production/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 smartnotes smartnotes
    postrotate
        docker-compose -f /opt/smartnotes-production/docker-compose.production.yml restart app
    endscript
}
```

### **3. Backup Configuration**

```bash
# Create backup script
nano /opt/smartnotes-production/scripts/backup.sh

# Make executable
chmod +x /opt/smartnotes-production/scripts/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/smartnotes-production/scripts/backup.sh
```

---

## 🔄 CI/CD Setup

### **1. GitHub Secrets Configuration**

Add the following secrets to your GitHub repository:

```
PRODUCTION_HOST=your-server-ip
PRODUCTION_USER=your-ssh-user
PRODUCTION_SSH_KEY=your-private-ssh-key
PRODUCTION_DATABASE_URL=your-production-db-url
SLACK_WEBHOOK_URL=your-slack-webhook (optional)
```

### **2. Deploy Key Setup**

```bash
# Generate deploy key on server
ssh-keygen -t ed25519 -C "smartnotes-deploy" -f ~/.ssh/smartnotes_deploy

# Add public key to GitHub repository deploy keys
cat ~/.ssh/smartnotes_deploy.pub

# Add private key to GitHub secrets as PRODUCTION_SSH_KEY
cat ~/.ssh/smartnotes_deploy
```

---

## 🚀 Going Live

### **1. DNS Configuration**

Configure your DNS records:
```
A     smartnotes.app          -> YOUR_SERVER_IP
A     www.smartnotes.app      -> YOUR_SERVER_IP
A     api.smartnotes.app      -> YOUR_SERVER_IP
CNAME cdn.smartnotes.app      -> your-cdn-domain (if using CDN)
```

### **2. Final Checks**

```bash
# Test all endpoints
curl -f https://smartnotes.app
curl -f https://api.smartnotes.app/health
curl -f https://smartnotes.app/api/health

# Test SSL
curl -I https://smartnotes.app | grep "HTTP/2 200"

# Test security headers
curl -I https://smartnotes.app | grep "Strict-Transport-Security"

# Test performance
curl -w "@curl-format.txt" -o /dev/null -s https://smartnotes.app
```

### **3. Performance Optimization**

```bash
# Enable HTTP/2
# (Already configured in nginx.conf)

# Configure CDN (CloudFlare example)
# 1. Add domain to CloudFlare
# 2. Update DNS to CloudFlare nameservers
# 3. Enable "Full (strict)" SSL mode
# 4. Enable "Always Use HTTPS"
# 5. Configure caching rules
```

---

## 📈 Scaling Considerations

### **1. Horizontal Scaling**

```bash
# Scale application containers
docker-compose -f docker-compose.production.yml up -d --scale app=3

# Configure load balancer
# Update nginx upstream configuration
```

### **2. Database Scaling**

```bash
# Use managed database service (recommended)
# - AWS RDS
# - Google Cloud SQL
# - Azure Database for MySQL

# Configure read replicas for better performance
```

### **3. Caching Strategy**

```bash
# Redis cluster for high availability
# Configure Redis Sentinel or Cluster mode

# CDN configuration for static assets
# Use CloudFlare, AWS CloudFront, or similar
```

---

## 🔧 Maintenance

### **1. Regular Updates**

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d

# Update SSL certificates (automated with certbot)
sudo certbot renew --dry-run
```

### **2. Backup Verification**

```bash
# Test backup restoration
docker-compose -f docker-compose.production.yml --profile backup up

# Verify backup integrity
mysql -h backup-server -u backup-user -p smartnotes < latest-backup.sql
```

### **3. Security Audits**

```bash
# Run security scans
docker run --rm -v /opt/smartnotes-production:/app clair-scanner:latest

# Check for vulnerabilities
npm audit --audit-level moderate

# Update dependencies
npm update
```

---

## 🆘 Troubleshooting

### **Common Issues**

1. **SSL Certificate Issues**
   ```bash
   sudo certbot renew --force-renewal
   sudo systemctl restart nginx
   ```

2. **Database Connection Issues**
   ```bash
   docker-compose -f docker-compose.production.yml logs db
   docker-compose -f docker-compose.production.yml restart db
   ```

3. **High Memory Usage**
   ```bash
   docker stats
   docker-compose -f docker-compose.production.yml restart app
   ```

4. **Disk Space Issues**
   ```bash
   docker system prune -a
   sudo logrotate -f /etc/logrotate.d/smartnotes
   ```

### **Emergency Procedures**

1. **Rollback Deployment**
   ```bash
   git checkout previous-stable-tag
   docker-compose -f docker-compose.production.yml up -d
   ```

2. **Database Recovery**
   ```bash
   docker-compose -f docker-compose.production.yml stop app
   mysql -h db-host -u root -p smartnotes < backup-file.sql
   docker-compose -f docker-compose.production.yml start app
   ```

---

## 📞 Support

For deployment support:
- 📧 Email: devops@smartnotes.app
- 📖 Documentation: https://docs.smartnotes.app/deployment
- 💬 Discord: https://discord.gg/smartnotes

---

**🎉 Congratulations! Your SmartNotes production deployment is now live and ready to serve users worldwide!**
