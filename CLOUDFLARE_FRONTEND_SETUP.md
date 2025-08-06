# 🌐 Cloudflare Frontend Setup Guide

## 📋 Architecture Overview

- **Backend**: VPS (148.230.90.76) - Game API, SpacetimeDB, WebSocket
- **Frontend**: Cloudflare Pages/Workers - Static assets, UI, client-side logic
- **Domain**: Your custom domain with Cloudflare DNS

## 🚀 Quick Setup Options

### Option 1: Cloudflare Pages (Recommended)
Deploy static frontend files to Cloudflare Pages for maximum performance.

### Option 2: Cloudflare Workers
Use Cloudflare Workers for serverless functions and edge computing.

## 📦 Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Domain**: Have a domain ready (e.g., `your-domain.com`)
3. **Backend Deployed**: VPS backend must be running
4. **GitHub Repository**: For Cloudflare Pages deployment

## 🔧 Cloudflare Pages Setup

### Step 1: Prepare Frontend Files

Create a frontend directory structure:

```bash
mkdir frostfire-frontend
cd frostfire-frontend
```

### Step 2: Create Frontend Package

```bash
# Extract frontend files from your project
mkdir -p public src
cp -r ../src/webserver/www/public/* public/
cp -r ../src/webserver/www/src/* src/
```

### Step 3: Create Frontend Configuration

Create `wrangler.toml` for Cloudflare Pages:

```toml
name = "frostfire-frontend"
compatibility_date = "2024-01-01"

[env.production]
name = "frostfire-frontend-prod"

[env.staging]
name = "frostfire-frontend-staging"
```

### Step 4: Create Frontend Environment

Create `.env.production`:

```env
# Backend API Configuration
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=wss://api.your-domain.com/ws
VITE_SPACETIME_URL=https://api.your-domain.com/spacetime

# Game Configuration
VITE_GAME_NAME=Frostfire Forge
VITE_VERSION=1.0.0

# Cloudflare Configuration
VITE_CLOUDFLARE_ANALYTICS_TOKEN=your_analytics_token
```

### Step 5: Update Frontend Code

Update API endpoints in your frontend code:

```javascript
// config/api.js
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'https://api.your-domain.com',
  WS_URL: import.meta.env.VITE_WS_URL || 'wss://api.your-domain.com/ws',
  SPACETIME_URL: import.meta.env.VITE_SPACETIME_URL || 'https://api.your-domain.com/spacetime',
};

export default API_CONFIG;
```

### Step 6: Deploy to Cloudflare Pages

#### Method A: GitHub Integration

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial frontend setup"
   git remote add origin https://github.com/yourusername/frostfire-frontend.git
   git push -u origin main
   ```

2. **Connect to Cloudflare Pages**:
   - Go to Cloudflare Dashboard
   - Navigate to Pages
   - Click "Create a project"
   - Connect your GitHub repository
   - Configure build settings:
     - **Framework preset**: None
     - **Build command**: `npm run build` (if using build tool)
     - **Build output directory**: `dist` or `public`
     - **Root directory**: `/` (leave empty)

#### Method B: Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to Pages
wrangler pages deploy public --project-name frostfire-frontend
```

## 🔧 Cloudflare Workers Setup (Optional)

### Step 1: Create Worker for API Proxy

Create `worker.js`:

```javascript
// worker.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Proxy API requests to backend
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = `https://api.your-domain.com${url.pathname}${url.search}`;
      
      const backendRequest = new Request(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const response = await fetch(backendRequest);
      
      // Add CORS headers to response
      const responseHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    // Serve static files
    return env.ASSETS.fetch(request);
  },
};
```

### Step 2: Deploy Worker

```bash
# Deploy worker
wrangler deploy --name frostfire-api-proxy
```

## 🌐 Domain Configuration

### Step 1: Configure DNS

1. **Add DNS Records**:
   ```
   Type: A
   Name: api
   Content: 148.230.90.76
   Proxy: Enabled (Orange Cloud)
   ```

   ```
   Type: CNAME
   Name: www
   Content: your-domain.com
   Proxy: Enabled (Orange Cloud)
   ```

### Step 2: Configure SSL/TLS

1. **SSL/TLS Mode**: Full (strict)
2. **Edge Certificates**: Always Use HTTPS
3. **Origin Certificates**: Generate for backend

### Step 3: Configure Page Rules

Create page rules for optimal performance:

1. **API Cache Bypass**:
   - URL: `api.your-domain.com/*`
   - Settings: Cache Level → Bypass

2. **WebSocket Support**:
   - URL: `api.your-domain.com/ws`
   - Settings: Cache Level → Bypass

## 🔧 Frontend Code Updates

### Update WebSocket Connection

```javascript
// websocket.js
class GameWebSocket {
  constructor() {
    this.wsUrl = import.meta.env.VITE_WS_URL || 'wss://api.your-domain.com/ws';
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.wsUrl);
    
    this.ws.onopen = () => {
      console.log('Connected to game server');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from game server');
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
```

### Update API Calls

```javascript
// api.js
class GameAPI {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'https://api.your-domain.com';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async login(username, password) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getPlayerInfo() {
    return this.request('/api/player/info');
  }
}
```

## 📊 Performance Optimization

### Cloudflare Settings

1. **Caching**:
   - Static assets: Cache Everything
   - API responses: Bypass Cache
   - HTML: Cache Level → Standard

2. **Compression**:
   - Enable Brotli compression
   - Enable Gzip compression

3. **Minification**:
   - Enable JavaScript minification
   - Enable CSS minification
   - Enable HTML minification

### Frontend Optimization

1. **Bundle Optimization**:
   ```javascript
   // vite.config.js
   export default {
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             game: ['./src/game/engine.js'],
           },
         },
       },
     },
   };
   ```

2. **Asset Optimization**:
   - Compress images
   - Use WebP format
   - Implement lazy loading

## 🔍 Monitoring & Analytics

### Cloudflare Analytics

1. **Web Analytics**:
   - Enable Cloudflare Web Analytics
   - Track page views and user behavior

2. **Performance Monitoring**:
   - Monitor Core Web Vitals
   - Track API response times

### Custom Monitoring

```javascript
// monitoring.js
class GameAnalytics {
  constructor() {
    this.events = [];
  }

  trackEvent(eventName, data = {}) {
    const event = {
      name: eventName,
      data,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
    };

    this.events.push(event);
    this.sendToAnalytics(event);
  }

  sendToAnalytics(event) {
    // Send to your analytics service
    fetch('https://api.your-domain.com/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(console.error);
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check backend CORS configuration
   - Verify domain in CORS headers

2. **WebSocket Connection Issues**:
   - Check Cloudflare WebSocket support
   - Verify SSL certificate

3. **API Timeouts**:
   - Increase Cloudflare timeout settings
   - Check backend response times

### Debug Commands

```bash
# Test API endpoints
curl -I https://api.your-domain.com/health
curl -I https://api.your-domain.com/api/player/info

# Test WebSocket
wscat -c wss://api.your-domain.com/ws

# Check Cloudflare status
curl -I https://your-domain.com
```

## 📈 Deployment Checklist

- [ ] Backend deployed and running
- [ ] Domain DNS configured
- [ ] SSL certificates active
- [ ] Frontend deployed to Cloudflare Pages
- [ ] API endpoints updated in frontend
- [ ] WebSocket connections working
- [ ] CORS headers configured
- [ ] Performance monitoring active
- [ ] Analytics tracking enabled

## 🎉 Success!

Your Frostfire Forge game now has:
- **High-performance frontend** on Cloudflare's global network
- **Secure backend** on your VPS
- **Real-time multiplayer** via WebSocket
- **Scalable architecture** ready for growth

---

**🌐 Frontend URL**: https://your-domain.com
**🔌 API URL**: https://api.your-domain.com
**📊 Monitoring**: Cloudflare Dashboard 