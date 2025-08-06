#!/bin/bash

# Frostfire Forge Backend-Only VPS Deployment
# Target: srv938129.hstgr.cloud (148.230.90.76)
# Frontend: Cloudflare Pages/Workers

set -e

VPS_HOST="148.230.90.76"
VPS_USER="root"
BACKEND_PORT="8080"
SPACETIME_PORT="3002"
API_PORT="3001"

echo "🚀 Deploying Frostfire Forge Backend to VPS..."
echo "📍 Target: $VPS_HOST"
echo "🖥️  OS: Debian 12"
echo "🌐 Frontend: Cloudflare (separate deployment)"
echo ""

echo "Step 1: Testing SSH connection..."
ssh -o ConnectTimeout=10 $VPS_USER@$VPS_HOST "echo 'SSH connection successful!'"

echo ""
echo "Step 2: Installing system dependencies..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
echo "Updating system packages..."
apt update && apt upgrade -y

echo "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "Installing Bun..."
curl -fsSL https://bun.sh/install | bash
export PATH="/root/.bun/bin:$PATH"

echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER

echo "Installing SpacetimeDB CLI..."
curl -sSf https://install.spacetimedb.com | sh
export PATH="/root/.local/bin:$PATH"

echo "Installing Nginx..."
apt install -y nginx

echo "Installing PM2..."
npm install -g pm2

echo "✅ System dependencies installed!"
EOF

echo ""
echo "Step 3: Creating project directory..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
mkdir -p /opt/frostfire-backend
cd /opt/frostfire-backend
echo "✅ Project directory created!"
EOF

echo ""
echo "Step 4: Creating backend deployment package..."
# Create a backend-only package excluding frontend files
tar --exclude='node_modules' --exclude='.git' --exclude='target' --exclude='src/webserver/www' --exclude='src/webserver/www/public' -czf frostfire-backend.tar.gz .

echo ""
echo "Step 5: Uploading backend files..."
scp frostfire-backend.tar.gz $VPS_USER@$VPS_HOST:/opt/frostfire-backend/

echo ""
echo "Step 6: Setting up backend on VPS..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
cd /opt/frostfire-backend
tar -xzf frostfire-backend.tar.gz
rm frostfire-backend.tar.gz

echo "Installing backend dependencies..."
export PATH="/root/.bun/bin:$PATH"
bun install

echo "Creating backend-only environment..."
cat > .env.production << 'ENVEOF'
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
WEB_SOCKET_URL="wss://api.your-domain.com"
ASSET_PATH="../../config/assets.json"
DOMAIN="https://api.your-domain.com"
GAME_NAME="Frostfire Forge"
DATABASE_PORT=3306
CORS_ORIGIN="https://your-domain.com"
ENVEOF

echo "Setting up database..."
bun setup-production

echo "✅ Backend setup completed!"
EOF

echo ""
echo "Step 7: Setting up SpacetimeDB..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
cd /opt/frostfire-backend

echo "Starting SpacetimeDB container..."
docker run -d \
  --name spacetimedb \
  --restart unless-stopped \
  -p 3002:3002 \
  -v spacetimedb_data:/var/lib/spacetimedb \
  ghcr.io/clockworklabs/spacetimedb:latest

echo "Waiting for SpacetimeDB to start..."
sleep 15

echo "Publishing SpacetimeDB module..."
export PATH="/root/.local/bin:$PATH"
spacetime init frostfire-forge
cd frostfire-game
cargo build --release
spacetime publish --project-path . frostfire-forge

echo "✅ SpacetimeDB setup completed!"
EOF

echo ""
echo "Step 8: Creating API-only Nginx configuration..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
echo "Creating API-only Nginx configuration..."
cat > /etc/nginx/sites-available/frostfire-api << 'NGINXEOF'
server {
    listen 80;
    server_name api.your-domain.com;

    # CORS headers for Cloudflare frontend
    add_header 'Access-Control-Allow-Origin' 'https://your-domain.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://your-domain.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    # Game API endpoints
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for real-time game
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

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API documentation
    location /docs {
        proxy_pass http://localhost:8080/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF

echo "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/frostfire-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "✅ Nginx API configuration completed!"
EOF

echo ""
echo "Step 9: Setting up PM2 for backend services..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
cd /opt/frostfire-backend

echo "Creating PM2 ecosystem file for backend..."
cat > ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'frostfire-api',
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

echo "Starting PM2 services..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ PM2 backend services started!"
EOF

echo ""
echo "Step 10: Configuring firewall for API..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
echo "Setting up firewall rules for API..."
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp
ufw allow 3001/tcp
ufw allow 3002/tcp
ufw --force enable

echo "✅ Firewall configured for API!"
EOF

echo ""
echo "Step 11: Creating API monitoring script..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
cd /opt/frostfire-backend

echo "Creating API monitoring script..."
cat > monitor.sh << 'MONITOREOF'
#!/bin/bash

echo "=== Frostfire Forge Backend Status ==="
echo "Time: $(date)"
echo ""

echo "=== PM2 Processes ==="
pm2 status
echo ""

echo "=== Docker Containers ==="
docker ps
echo ""

echo "=== API Endpoints ==="
echo "Health: http://$(curl -s ifconfig.me):8080/health"
echo "API: http://$(curl -s ifconfig.me):8080/"
echo "WebSocket: ws://$(curl -s ifconfig.me):3001"
echo "SpacetimeDB: http://$(curl -s ifconfig.me):3002"
echo ""

echo "=== Port Status ==="
netstat -tlnp | grep -E ':(80|443|8080|3001|3002)' || echo "No services found on expected ports"
echo ""

echo "=== System Resources ==="
df -h
free -h
echo ""

echo "=== Recent API Logs ==="
pm2 logs --lines 5
MONITOREOF

chmod +x monitor.sh

echo "✅ API monitoring script created!"
EOF

echo ""
echo "🎉 Backend deployment completed successfully!"
echo ""
echo "📋 Backend Deployment Summary:"
echo "🌐 API Server: http://$VPS_HOST:8080"
echo "🔌 SpacetimeDB: http://$VPS_HOST:3002"
echo "📊 PM2 Status: ssh $VPS_USER@$VPS_HOST 'pm2 status'"
echo "📈 Monitor: ssh $VPS_USER@$VPS_HOST 'cd /opt/frostfire-backend && ./monitor.sh'"
echo ""
echo "🔧 Next Steps for Frontend (Cloudflare):"
echo "1. Update your domain DNS to point to $VPS_HOST"
echo "2. Configure Cloudflare Pages/Workers for frontend"
echo "3. Update API endpoints in frontend to use: http://api.your-domain.com"
echo "4. Configure SSL certificate with Let's Encrypt"
echo "5. Update .env.production with your actual domain"
echo ""
echo "📞 Backend Support Commands:"
echo "- Check status: ssh $VPS_USER@$VPS_HOST 'pm2 status'"
echo "- View logs: ssh $VPS_USER@$VPS_HOST 'pm2 logs'"
echo "- Monitor: ssh $VPS_USER@$VPS_HOST 'cd /opt/frostfire-backend && ./monitor.sh'"
echo "- Restart: ssh $VPS_USER@$VPS_HOST 'pm2 restart all'" 