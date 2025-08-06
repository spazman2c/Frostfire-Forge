# 🚀 Frostfire Forge VPS Deployment Guide

## 📋 VPS Information
- **Server**: srv938129.hstgr.cloud
- **IP**: 148.230.90.76
- **OS**: Debian 12
- **SSH**: root access available

## 🎯 Quick Deployment

### Option 1: Automated Deployment (Recommended)
```bash
# Run the automated deployment script
./deploy_step_by_step.sh
```

### Option 2: Manual Step-by-Step
Follow the steps below if you prefer manual control.

## 📦 Prerequisites

1. **SSH Access**: Ensure you can connect to your VPS
2. **Domain**: Have a domain ready (optional but recommended)
3. **Local Setup**: Run this from your local Frostfire Forge directory

## 🔧 Manual Deployment Steps

### Step 1: Test SSH Connection
```bash
ssh root@148.230.90.76
```

### Step 2: Install System Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Bun
curl -fsSL https://bun.sh/install | bash
export PATH="/root/.bun/bin:$PATH"

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER

# Install SpacetimeDB CLI
curl -sSf https://install.spacetimedb.com | sh
export PATH="/root/.local/bin:$PATH"

# Install Nginx
apt install -y nginx

# Install PM2
npm install -g pm2
```

### Step 3: Create Project Directory
```bash
mkdir -p /opt/frostfire-forge
cd /opt/frostfire-forge
```

### Step 4: Upload Project Files
From your local machine:
```bash
# Create deployment package
tar --exclude='node_modules' --exclude='.git' --exclude='target' -czf frostfire-deploy.tar.gz .

# Upload to VPS
scp frostfire-deploy.tar.gz root@148.230.90.76:/opt/frostfire-forge/
```

### Step 5: Setup Project on VPS
```bash
cd /opt/frostfire-forge
tar -xzf frostfire-deploy.tar.gz
rm frostfire-deploy.tar.gz

# Install dependencies
export PATH="/root/.bun/bin:$PATH"
bun install

# Create production environment
cat > .env.production << 'EOF'
DATABASE_ENGINE=sqlite
DATABASE_HOST=localhost
DATABASE_NAME=frostfire_production
DATABASE_PASSWORD=secure_production_password_2024
DATABASE_USER=root
EMAIL_PASSWORD=
EMAIL_SERVICE="smtp.example.com"
EMAIL_TEST="alerts@example.com"
EMAIL_USER="noreply@example.com"
SESSION_KEY="frostfire_production_session_key_2024"
SQL_SSL_MODE=DISABLED
WEBSRV_PORT=8080
WEBSRV_PORTSSL=443
WEBSRV_USESSL=false
GOOGLE_TRANSLATE_API_KEY=
OPENAI_API_KEY=
OPEN_AI_MODEL=
TRANSLATION_SERVICE=
WEB_SOCKET_URL="ws://localhost:3001"
ASSET_PATH="../../config/assets.json"
DOMAIN="https://your-domain.com"
GAME_NAME="Frostfire Forge"
DATABASE_PORT=3306
EOF

# Setup database
bun setup-production
```

### Step 6: Setup SpacetimeDB
```bash
cd /opt/frostfire-forge

# Start SpacetimeDB container
docker run -d \
  --name spacetimedb \
  --restart unless-stopped \
  -p 3002:3002 \
  -v spacetimedb_data:/var/lib/spacetimedb \
  ghcr.io/clockworklabs/spacetimedb:latest

# Wait for startup
sleep 15

# Publish module
export PATH="/root/.local/bin:$PATH"
spacetime init frostfire-forge
cd frostfire-game
cargo build --release
spacetime publish --project-path . frostfire-forge
```

### Step 7: Configure Nginx
```bash
cat > /etc/nginx/sites-available/frostfire-forge << 'EOF'
server {
    listen 80;
    server_name _;

    # Game server
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SpacetimeDB API
    location /spacetime/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/frostfire-forge /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### Step 8: Setup PM2 Process Management
```bash
cd /opt/frostfire-forge

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'frostfire-game',
    script: './src/webserver/server.ts',
    interpreter: '/root/.bun/bin/bun',
    args: '--env-file=.env.production',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'spacetime-bridge',
    script: './init_spacetime_bridge.ts',
    interpreter: '/root/.bun/bin/bun',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 9: Configure Firewall
```bash
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp
ufw allow 3001/tcp
ufw allow 3002/tcp
ufw --force enable
```

## 🎉 Deployment Complete!

### 📊 Access Points
- **Game Server**: http://148.230.90.76:8080
- **SpacetimeDB**: http://148.230.90.76:3002
- **Nginx Proxy**: http://148.230.90.76

### 🔧 Management Commands
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Monitor system
cd /opt/frostfire-forge && ./monitor.sh
```

## 🌐 Domain Setup (Optional)

### 1. Update DNS
Point your domain to `148.230.90.76`

### 2. Update Environment
Edit `/opt/frostfire-forge/.env.production`:
```bash
DOMAIN="https://your-domain.com"
```

### 3. Configure SSL (Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## 📈 Monitoring

### Create Monitoring Script
```bash
cd /opt/frostfire-forge
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== Frostfire Forge Server Status ==="
echo "Time: $(date)"
echo ""
echo "=== PM2 Processes ==="
pm2 status
echo ""
echo "=== Docker Containers ==="
docker ps
echo ""
echo "=== Port Status ==="
netstat -tlnp | grep -E ':(80|443|8080|3001|3002)'
echo ""
echo "=== System Resources ==="
df -h
free -h
EOF

chmod +x monitor.sh
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -tlnp | grep :8080
   # Kill the process
   kill -9 <PID>
   ```

2. **PM2 Services Not Starting**
   ```bash
   # Check PM2 logs
   pm2 logs
   # Restart services
   pm2 restart all
   ```

3. **SpacetimeDB Connection Issues**
   ```bash
   # Check Docker container
   docker ps
   docker logs spacetimedb
   # Restart container
   docker restart spacetimedb
   ```

4. **Nginx Configuration Issues**
   ```bash
   # Test configuration
   nginx -t
   # Reload nginx
   systemctl reload nginx
   ```

### Support Commands
```bash
# Check all services
pm2 status && docker ps && systemctl status nginx

# View recent logs
pm2 logs --lines 20

# Check disk space
df -h

# Check memory usage
free -h

# Monitor real-time
watch -n 5 'pm2 status && echo "---" && docker ps'
```

## 🎮 Testing Your Deployment

1. **Test Game Server**: Visit http://148.230.90.76:8080
2. **Test SpacetimeDB**: Visit http://148.230.90.76:3002
3. **Test WebSocket**: Check browser console for WebSocket connections
4. **Test Multiplayer**: Open multiple browser tabs to test multiplayer

## 🔄 Updates and Maintenance

### Updating the Game
```bash
cd /opt/frostfire-forge
git pull origin main
bun install
pm2 restart all
```

### Backup Database
```bash
# Backup SQLite database
cp /opt/frostfire-forge/frostfire_production.db /backup/frostfire_$(date +%Y%m%d).db
```

### Monitoring
```bash
# Set up regular monitoring
crontab -e
# Add: */5 * * * * /opt/frostfire-forge/monitor.sh >> /var/log/frostfire-monitor.log
```

---

**🎉 Your Frostfire Forge server is now ready for multiplayer gaming!** 