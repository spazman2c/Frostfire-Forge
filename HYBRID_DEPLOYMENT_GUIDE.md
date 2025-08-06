# 🚀 Hybrid Deployment Guide: VPS Backend + Cloudflare Frontend

## 📋 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   Your Domain   │    │   VPS Backend   │
│   Frontend      │◄──►│   (DNS/SSL)     │◄──►│   (148.230.90.76)│
│   (Pages/Workers)│    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    Static Assets           SSL/TLS              Game API
    UI Components         Load Balancing        SpacetimeDB
    Client Logic         CORS Headers          WebSocket
```

## 🎯 Benefits of This Architecture

✅ **Performance**: Cloudflare's global CDN for frontend
✅ **Security**: VPS backend with full control
✅ **Scalability**: Easy to scale both frontend and backend
✅ **Cost-Effective**: Pay only for backend resources
✅ **Reliability**: Cloudflare's 99.9% uptime guarantee
✅ **SEO**: Fast loading times improve search rankings

## 🚀 Quick Start

### Step 1: Deploy Backend to VPS
```bash
# Run the backend deployment script
./deploy_backend_only.sh
```

### Step 2: Set Up Cloudflare Frontend
Follow the `CLOUDFLARE_FRONTEND_SETUP.md` guide

### Step 3: Configure Domain
1. Point domain to Cloudflare
2. Add API subdomain pointing to VPS
3. Configure SSL certificates

## 📦 What Gets Deployed Where

### 🖥️ VPS Backend (148.230.90.76)
- **Game API Server** (Port 8080)
- **SpacetimeDB** (Port 3002)
- **WebSocket Server** (Port 3001)
- **SQLite Database**
- **PM2 Process Management**
- **Nginx Reverse Proxy**

### 🌐 Cloudflare Frontend
- **Static HTML/CSS/JS**
- **Game Assets** (images, sounds)
- **Client-Side Logic**
- **UI Components**
- **Analytics & Monitoring**

## 🔧 Backend Deployment

### Prerequisites
- SSH access to VPS
- Domain ready for configuration
- Local Frostfire Forge project

### Automated Deployment
```bash
# Run the backend deployment
./deploy_backend_only.sh
```

### Manual Deployment Steps
1. **Install Dependencies** on VPS
2. **Upload Backend Files**
3. **Setup SpacetimeDB**
4. **Configure Nginx**
5. **Setup PM2 Services**
6. **Configure Firewall**

## 🌐 Frontend Deployment

### Cloudflare Pages Setup
1. **Create GitHub Repository** for frontend
2. **Extract Frontend Files** from project
3. **Configure Build Settings**
4. **Deploy to Cloudflare Pages**

### Environment Configuration
```env
# Frontend Environment Variables
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=wss://api.your-domain.com/ws
VITE_SPACETIME_URL=https://api.your-domain.com/spacetime
VITE_GAME_NAME=Frostfire Forge
```

## 🌐 Domain Configuration

### DNS Records
```
Type: A
Name: api
Content: 148.230.90.76
Proxy: Enabled (Orange Cloud)

Type: CNAME
Name: www
Content: your-domain.com
Proxy: Enabled (Orange Cloud)
```

### SSL/TLS Settings
- **SSL/TLS Mode**: Full (strict)
- **Edge Certificates**: Always Use HTTPS
- **Origin Certificates**: Generate for backend

## 🔧 API Configuration

### Backend API Endpoints
```
GET  /api/health          - Health check
POST /api/login           - User authentication
GET  /api/player/info     - Player information
POST /api/player/move     - Player movement
POST /api/chat            - Chat messages
WS   /ws                  - WebSocket connection
```

### CORS Configuration
```nginx
# Nginx CORS headers
add_header 'Access-Control-Allow-Origin' 'https://your-domain.com' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
```

## 📊 Monitoring & Analytics

### Backend Monitoring
```bash
# Check backend status
ssh root@148.230.90.76 'pm2 status'

# View logs
ssh root@148.230.90.76 'pm2 logs'

# Monitor system
ssh root@148.230.90.76 'cd /opt/frostfire-backend && ./monitor.sh'
```

### Frontend Analytics
- **Cloudflare Web Analytics**
- **Performance Monitoring**
- **Error Tracking**
- **User Behavior Analytics**

## 🔍 Testing Your Deployment

### Backend Tests
```bash
# Test API health
curl -I https://api.your-domain.com/health

# Test WebSocket
wscat -c wss://api.your-domain.com/ws

# Test SpacetimeDB
curl -I https://api.your-domain.com/spacetime
```

### Frontend Tests
```bash
# Test frontend loading
curl -I https://your-domain.com

# Test API integration
curl -X POST https://api.your-domain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check backend CORS configuration
   - Verify domain in CORS headers
   - Test with browser developer tools

2. **WebSocket Connection Issues**
   - Check Cloudflare WebSocket support
   - Verify SSL certificate
   - Test WebSocket endpoint

3. **API Timeouts**
   - Increase Cloudflare timeout settings
   - Check backend response times
   - Monitor server resources

4. **SSL Certificate Issues**
   - Verify SSL/TLS mode in Cloudflare
   - Check origin certificate configuration
   - Test certificate validity

### Debug Commands
```bash
# Test backend connectivity
ssh root@148.230.90.76 'curl -I localhost:8080/health'

# Check Cloudflare status
curl -I https://your-domain.com

# Test API endpoints
curl -X GET https://api.your-domain.com/api/player/info

# Monitor real-time logs
ssh root@148.230.90.76 'pm2 logs --lines 50'
```

## 📈 Performance Optimization

### Backend Optimization
- **Database Indexing**
- **Query Optimization**
- **Caching Strategies**
- **Load Balancing**

### Frontend Optimization
- **Asset Compression**
- **Code Splitting**
- **Lazy Loading**
- **CDN Caching**

### Cloudflare Optimization
- **Edge Caching**
- **Compression**
- **Minification**
- **Image Optimization**

## 🔄 Updates & Maintenance

### Backend Updates
```bash
# Update backend code
ssh root@148.230.90.76 'cd /opt/frostfire-backend && git pull'
ssh root@148.230.90.76 'pm2 restart all'

# Update SpacetimeDB
ssh root@148.230.90.76 'cd /opt/frostfire-backend/frostfire-game && cargo build --release'
ssh root@148.230.90.76 'spacetime publish --project-path . frostfire-forge'
```

### Frontend Updates
1. **Update GitHub repository**
2. **Cloudflare Pages auto-deploys**
3. **Test new deployment**
4. **Rollback if needed**

## 📊 Cost Analysis

### VPS Costs
- **Server**: $5-20/month
- **Bandwidth**: Included
- **Storage**: Included
- **Backup**: $2-5/month

### Cloudflare Costs
- **Pages**: Free tier available
- **Workers**: Free tier available
- **DNS**: Free
- **SSL**: Free

### Total Estimated Cost
- **Basic Setup**: $5-10/month
- **Production Setup**: $15-30/month

## 🎉 Success Metrics

### Performance Targets
- **Frontend Load Time**: < 2 seconds
- **API Response Time**: < 500ms
- **WebSocket Latency**: < 100ms
- **Uptime**: > 99.9%

### User Experience
- **Smooth Gameplay**: No lag or disconnections
- **Fast Loading**: Quick page loads
- **Mobile Friendly**: Responsive design
- **Cross-Platform**: Works on all devices

## 📋 Deployment Checklist

### Backend (VPS)
- [ ] System dependencies installed
- [ ] Backend files uploaded
- [ ] SpacetimeDB running
- [ ] Nginx configured
- [ ] PM2 services started
- [ ] Firewall configured
- [ ] SSL certificate active
- [ ] API endpoints tested

### Frontend (Cloudflare)
- [ ] Domain configured in Cloudflare
- [ ] DNS records set up
- [ ] SSL certificate active
- [ ] Frontend deployed to Pages
- [ ] API endpoints updated
- [ ] WebSocket connections working
- [ ] CORS headers configured
- [ ] Performance monitoring active

### Integration
- [ ] Frontend connects to backend API
- [ ] WebSocket connections established
- [ ] Real-time multiplayer working
- [ ] User authentication functional
- [ ] Game state synchronization working
- [ ] Error handling implemented
- [ ] Analytics tracking enabled

## 🚀 Next Steps

1. **Deploy Backend**: Run `./deploy_backend_only.sh`
2. **Setup Frontend**: Follow Cloudflare guide
3. **Configure Domain**: Set up DNS and SSL
4. **Test Integration**: Verify all connections
5. **Monitor Performance**: Set up monitoring
6. **Scale as Needed**: Add more resources

---

**🎮 Your hybrid Frostfire Forge deployment is ready for production!**

**🌐 Frontend**: https://your-domain.com
**🔌 API**: https://api.your-domain.com
**📊 Monitoring**: Cloudflare Dashboard + VPS logs 