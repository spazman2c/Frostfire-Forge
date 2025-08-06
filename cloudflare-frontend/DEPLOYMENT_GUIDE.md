
# 🚀 Cloudflare Frontend Deployment Guide

## 📋 **Overview**

This guide will help you deploy the Frostfire Forge frontend to Cloudflare Pages/Workers, creating a hybrid deployment with your VPS backend.

## 🎯 **Architecture**

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

## 🛠️ **Prerequisites**

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Domain Name**: A domain you control (optional but recommended)
3. **Node.js**: For local development and deployment
4. **Wrangler CLI**: Cloudflare's deployment tool

## 📦 **Installation Steps**

### 1. **Install Wrangler CLI**

```bash
npm install -g wrangler
```

### 2. **Login to Cloudflare**

```bash
wrangler login
```

### 3. **Install Dependencies**

```bash
cd cloudflare-frontend
npm install
```

## ⚙️ **Configuration**

### 1. **Update Backend URLs**

Edit `public/config.js` to point to your VPS backend:

```javascript
const CONFIG = {
  // Update these to your VPS IP or domain
  API_BASE_URL: 'http://148.230.90.76',
  WS_URL: 'ws://148.230.90.76/ws',
  
  // Game Configuration
  GAME_NAME: 'Frostfire Forge',
  VERSION: '1.0.0',
  
  // Development/Production flags
  DEBUG: false,
  ENABLE_LOGGING: true
};
```

### 2. **Update Wrangler Configuration**

Edit `wrangler.toml` with your project details:

```toml
name = "frostfire-forge-frontend"
main = "src/index.js"
compatibility_date = "2024-01-01"

[site]
bucket = "./public"
entry-point = "workers-site"

[env.production]
name = "frostfire-forge-frontend"
vars = { ENVIRONMENT = "production" }
```

## 🚀 **Deployment Options**

### **Option 1: Cloudflare Pages (Recommended)**

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial Frostfire Forge frontend"
   git remote add origin https://github.com/yourusername/frostfire-forge-frontend.git
   git push -u origin main
   ```

2. **Deploy via Cloudflare Dashboard**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to Pages
   - Click "Create a project"
   - Connect your GitHub repository
   - Set build settings:
     - Build command: `npm run build` (or leave empty for static)
     - Build output directory: `public`
   - Deploy!

### **Option 2: Cloudflare Workers (Advanced)**

1. **Deploy via Wrangler**:
   ```bash
   # Deploy to production
   npm run deploy:production
   
   # Deploy to staging
   npm run deploy:staging
   ```

2. **Custom Domain Setup**:
   ```bash
   # Add custom domain
   wrangler domain add your-domain.com
   ```

## 🌐 **Domain Configuration**

### 1. **Point Domain to Cloudflare**

1. Add your domain to Cloudflare
2. Update nameservers at your registrar
3. Wait for DNS propagation (up to 48 hours)

### 2. **Configure DNS Records**

Create these DNS records in Cloudflare:

```
Type    Name    Content
A       @       148.230.90.76    # Backend API
CNAME   www     your-pages-url   # Frontend
```

### 3. **SSL/TLS Configuration**

- Set SSL/TLS mode to "Full" or "Full (strict)"
- Enable "Always Use HTTPS"
- Configure security headers in Cloudflare

## 🔧 **Environment Variables**

Set these in your Cloudflare dashboard:

```bash
# Production
ENVIRONMENT=production
API_BASE_URL=http://148.230.90.76
WS_URL=ws://148.230.90.76/ws

# Staging
ENVIRONMENT=staging
API_BASE_URL=http://148.230.90.76
WS_URL=ws://148.230.90.76/ws
```

## 🧪 **Testing**

### 1. **Local Development**

```bash
# Start local development server
npm run dev

# Test locally
open http://localhost:8788
```

### 2. **Production Testing**

1. Deploy to staging first
2. Test all game features
3. Verify WebSocket connections
4. Check CORS headers
5. Deploy to production

## 🔍 **Troubleshooting**

### **Common Issues**

1. **CORS Errors**:
   - Ensure backend has proper CORS headers
   - Check API_BASE_URL configuration

2. **WebSocket Connection Failed**:
   - Verify WS_URL points to correct backend
   - Check firewall settings on VPS

3. **Assets Not Loading**:
   - Check file paths in public directory
   - Verify Cloudflare caching settings

### **Debug Commands**

```bash
# Check deployment status
wrangler whoami

# View logs
wrangler tail

# Test locally
wrangler dev

# Check configuration
wrangler config
```

## 📊 **Performance Optimization**

### 1. **Cloudflare Settings**

- Enable "Auto Minify" for JS, CSS, HTML
- Enable "Brotli" compression
- Set appropriate cache headers

### 2. **Asset Optimization**

- Compress images (PNG, JPG)
- Minify JavaScript files
- Enable gzip compression

### 3. **CDN Configuration**

- Use Cloudflare's global CDN
- Enable "Argo" for faster routing
- Configure edge caching rules

## 🔒 **Security**

### 1. **Security Headers**

Configure these headers in Cloudflare:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
```

### 2. **CSP (Content Security Policy)**

Add CSP header to prevent XSS:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

## 📈 **Monitoring**

### 1. **Cloudflare Analytics**

- Enable Web Analytics
- Monitor performance metrics
- Track user engagement

### 2. **Error Tracking**

- Set up error logging
- Monitor WebSocket connections
- Track API response times

## 🔄 **Updates**

### 1. **Frontend Updates**

```bash
# Update code
git add .
git commit -m "Update frontend"
git push

# Cloudflare Pages will auto-deploy
```

### 2. **Configuration Updates**

- Update `config.js` for new backend URLs
- Modify `wrangler.toml` for new settings
- Redeploy after changes

## 🎯 **Next Steps**

After successful deployment:

1. **Test the complete game**
2. **Configure custom domain**
3. **Set up monitoring**
4. **Optimize performance**
5. **Plan scaling strategy**

---

**🎮 Your Frostfire Forge frontend is now ready for Cloudflare deployment!**

**Need help?** Check the troubleshooting section or contact support. 