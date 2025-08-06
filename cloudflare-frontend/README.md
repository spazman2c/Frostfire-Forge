# 🎮 Frostfire Forge - Cloudflare Frontend

This is the frontend deployment package for Frostfire Forge, designed to run on Cloudflare Pages/Workers while connecting to your VPS backend.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Deploy to Cloudflare
./quick-deploy.sh
```

## 📁 Project Structure

```
├── public/                    # Static assets
│   ├── game.html             # Main game interface
│   ├── config.js             # Backend API configuration
│   ├── js/                   # Game scripts
│   ├── css/                  # Stylesheets
│   ├── img/                  # Game images
│   └── libs/                 # Third-party libraries
├── src/
│   └── index.js              # Cloudflare Worker
├── wrangler.toml             # Cloudflare configuration
├── package.json              # Dependencies
├── DEPLOYMENT_GUIDE.md       # Detailed deployment guide
└── quick-deploy.sh           # Quick deployment script
```

## 🔧 Configuration

Edit `public/config.js` to update backend URLs:

```javascript
const CONFIG = {
  API_BASE_URL: 'http://148.230.90.76',
  WS_URL: 'ws://148.230.90.76/ws',
  GAME_NAME: 'Frostfire Forge',
  VERSION: '1.0.0'
};
```

## 🚀 Deployment Options

### Cloudflare Pages (Recommended)
- Perfect for static frontend hosting
- Automatic deployments from GitHub
- Global CDN with edge caching

### Cloudflare Workers
- More control over server-side logic
- Custom routing and middleware

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Detailed setup instructions
- [Backend Integration](../BACKEND_DEPLOYMENT_SUCCESS.md) - VPS backend status

## 🎯 Backend Connection

This frontend connects to:
- **API Server**: http://148.230.90.76
- **WebSocket**: ws://148.230.90.76/ws
- **Health Check**: http://148.230.90.76/health

## 🧪 Testing

```bash
# Local development
npm run dev

# Test locally
open http://localhost:8788
```

## 📊 Features

- ✅ Real-time WebSocket connection
- ✅ Asset loading and caching
- ✅ User authentication
- ✅ Game state management
- ✅ Chat system
- ✅ Inventory management
- ✅ Party system
- ✅ Friends list

---

**🎮 Ready for Cloudflare deployment!** 