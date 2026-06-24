#!/bin/bash
# FunBreak SEO — Production Deploy Script (Contabo Ubuntu 24.04)
# Run from /home/funbreak/funbreakseo

set -e

echo "🚀 FunBreak SEO Deploy Starting..."

# Pull latest
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile

# Generate Prisma client
pnpm --filter @funbreakseo/database generate

# Run migrations
pnpm --filter @funbreakseo/database migrate:deploy

# Build all apps
pnpm build

echo "✅ Build complete. Restarting PM2 processes..."

# Restart API
pm2 restart fb-api || pm2 start apps/api/dist/main.js --name fb-api --interpreter none

# Restart Worker
pm2 restart fb-worker || pm2 start apps/api/dist/worker.js --name fb-worker --interpreter none

# Restart Web
pm2 restart fb-web || pm2 start "pnpm --filter @funbreakseo/web start" --name fb-web

# Restart Admin
pm2 restart fb-admin || pm2 start "pnpm --filter @funbreakseo/admin start" --name fb-admin

pm2 save

echo "✅ Deploy complete!"
echo ""
echo "Services:"
pm2 status
