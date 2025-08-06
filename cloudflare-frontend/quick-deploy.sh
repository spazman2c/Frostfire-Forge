#!/bin/bash

# Frostfire Forge - Cloudflare Frontend Quick Deploy
# This script helps you quickly deploy the frontend to Cloudflare

set -e

echo "🚀 Frostfire Forge Cloudflare Frontend Deployment"
echo "=================================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare..."
    wrangler login
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check configuration
echo "⚙️  Checking configuration..."
if [ ! -f "public/config.js" ]; then
    echo "❌ Configuration file not found!"
    exit 1
fi

# Test local development
echo "🧪 Testing local development..."
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Test the local server
if curl -s http://localhost:8788 > /dev/null; then
    echo "✅ Local development server is running"
else
    echo "❌ Local development server failed to start"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

# Stop local server
kill $DEV_PID 2>/dev/null || true

echo ""
echo "🎯 Ready to deploy! Choose an option:"
echo ""
echo "1. Deploy to Cloudflare Pages (Recommended)"
echo "2. Deploy to Cloudflare Workers"
echo "3. Exit"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "📚 Follow these steps for Cloudflare Pages deployment:"
        echo ""
        echo "1. Push this code to GitHub:"
        echo "   git init"
        echo "   git add ."
        echo "   git commit -m 'Initial Frostfire Forge frontend'"
        echo "   git remote add origin https://github.com/yourusername/frostfire-forge-frontend.git"
        echo "   git push -u origin main"
        echo ""
        echo "2. Go to Cloudflare Dashboard:"
        echo "   https://dash.cloudflare.com"
        echo ""
        echo "3. Navigate to Pages → Create a project"
        echo ""
        echo "4. Connect your GitHub repository"
        echo ""
        echo "5. Set build settings:"
        echo "   - Build command: (leave empty for static)"
        echo "   - Build output directory: public"
        echo ""
        echo "6. Deploy!"
        ;;
    2)
        echo "🚀 Deploying to Cloudflare Workers..."
        npm run deploy:production
        echo "✅ Deployment complete!"
        ;;
    3)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎮 Your Frostfire Forge frontend is ready!"
echo "📖 Check DEPLOYMENT_GUIDE.md for detailed instructions"
echo "🔗 Backend API: http://148.230.90.76"
echo "🌐 WebSocket: ws://148.230.90.76/ws" 