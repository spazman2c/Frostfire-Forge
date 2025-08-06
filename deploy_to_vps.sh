#!/bin/bash

# Frostfire Forge VPS Deployment Script
# Target: srv938129.hstgr.cloud (148.230.90.76)

set -e

echo "🚀 Deploying Frostfire Forge to VPS..."
echo "📍 Target: srv938129.hstgr.cloud (148.230.90.76)"
echo "🖥️  OS: Debian 12"

# Configuration
VPS_HOST="148.230.90.76"
VPS_USER="root"
GAME_PORT="8080"
SPACETIME_PORT="3002"
DOMAIN="your-domain.com"  # Replace with your actual domain

echo "📦 Installing dependencies..."

# Update system
ssh $VPS_USER@$VPS_HOST << 'EOF'
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js and npm
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

# Install PM2 for process management
npm install -g pm2

echo "✅ Dependencies installed successfully!"
EOF

echo "📁 Setting up project structure..."

# Create project directory and upload files
ssh $VPS_USER@$VPS_HOST << 'EOF'
mkdir -p /opt/frostfire-forge
cd /opt/frostfire-forge
EOF

echo "📤 Uploading project files..."

# Create a deployment package
tar --exclude='node_modules' --exclude='.git' --exclude='target' -czf frostfire-deploy.tar.gz .

# Upload the package
scp frostfire-deploy.tar.gz $VPS_USER@$VPS_HOST:/opt/frostfire-forge/

# Extract and setup on VPS
ssh $VPS_USER@$VPS_HOST << 'EOF'
cd /opt/frostfire-forge
tar -xzf frostfire-deploy.tar.gz
rm frostfire-deploy.tar.gz

# Install dependencies
export PATH="/root/.bun/bin:$PATH"
bun install

# Create production environment file
cat > .env.production << 'ENVEOF'
DATABASE_ENGINE=sqlite
DATABASE_HOST=localhost
DATABASE_NAME=frostfire_production
DATABASE_PASSWORD=secure_password_here
DATABASE_USER=root
EMAIL_PASSWORD=
EMAIL_SERVICE="smtp.example.com"
EMAIL_TEST="alerts@example.com"
EMAIL_USER="noreply@example.com"
SESSION_KEY="$(openssl rand -hex 32)"
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
ENVEOF

# Setup database
bun setup-production

echo "✅ Project files uploaded and configured!"
EOF

echo "🐳 Setting up SpacetimeDB..."

# Setup SpacetimeDB
ssh $VPS_USER@$VPS_HOST << 'EOF'
cd /opt/frostfire-forge

# Start SpacetimeDB in Docker
docker run -d \
  --name spacetimedb \
  --restart unless-stopped \
  -p 3002:3002 \
  -v spacetimedb_data:/var/lib/spacetimedb \
  ghcr.io/clockworklabs/spacetimedb:latest

# Wait for SpacetimeDB to start
sleep 10

# Install SpacetimeDB CLI and publish module
export PATH="/root/.local/bin:$PATH"
spacetime init frostfire-forge
cd frostfire-game
cargo build --release
spacetime publish --project-path . frostfire-forge

echo "✅ SpacetimeDB setup completed!"
EOF

echo "🌐 Setting up Nginx reverse proxy..."

# Configure Nginx
ssh $VPS_USER@$VPS_HOST << EOF
cat > /etc/nginx/sites-available/frostfire-forge << 'NGINXEOF'
server {
    listen 80;
    server_name $DOMAIN;

    # Game server
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # SpacetimeDB API
    location /spacetime/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF

# Enable the site
ln -sf /etc/nginx/sites-available/frostfire-forge /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "✅ Nginx configured!"
EOF

echo "🚀 Setting up PM2 process management..."

# Setup PM2 for the game server
ssh $VPS_USER@$VPS_HOST << 'EOF'
cd /opt/frostfire-forge

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'PM2EOF'
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
PM2EOF

# Start the services
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ PM2 services started!"
EOF

echo "🔒 Setting up firewall..."

# Configure firewall
ssh $VPS_USER@$VPS_HOST << 'EOF'
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp
ufw allow 3001/tcp
ufw allow 3002/tcp
ufw --force enable

echo "✅ Firewall configured!"
EOF

echo "📊 Creating monitoring script..."

# Create monitoring script
ssh $VPS_USER@$VPS_HOST << 'EOF'
cat > /opt/frostfire-forge/monitor.sh << 'MONITOREOF'
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

echo "=== Disk Usage ==="
df -h
echo ""

echo "=== Memory Usage ==="
free -h
echo ""

echo "=== Recent Logs ==="
pm2 logs --lines 10
MONITOREOF

chmod +x /opt/frostfire-forge/monitor.sh

echo "✅ Monitoring script created!"
EOF

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "🌐 Game Server: http://$VPS_HOST:8080"
echo "🔌 SpacetimeDB: http://$VPS_HOST:3002"
echo "📊 PM2 Status: pm2 status"
echo "📈 Monitor: /opt/frostfire-forge/monitor.sh"
echo ""
echo "🔧 Next Steps:"
echo "1. Update your domain DNS to point to $VPS_HOST"
echo "2. Configure SSL certificate with Let's Encrypt"
echo "3. Update .env.production with your actual domain"
echo "4. Test the game at http://$VPS_HOST:8080"
echo ""
echo "📞 Support: Check logs with 'pm2 logs' or run the monitor script" 