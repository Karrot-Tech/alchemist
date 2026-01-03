#!/bin/bash

echo "🚀 Starting Alchemist Deployment..."

# Check if Vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi


# 1. Install Dependencies (Root + Client + Server via postinstall)
echo "📦 Installing Dependencies..."
npm install

# 2. Build Client
echo "🛠️  Building Client..."
npm run build

echo "☁️  Deploying to Vercel..."
# Pull environment variables if needed, or just deploy
# Note: --prod deploys to production directly. Remove it for preview.
vercel deploy --prod

echo "✅ Deployment trigger sent!"
