#!/bin/bash
# FunBreak SEO — Production Deploy Script
# Sunucu: Contabo VPS Ubuntu 24.04
# Çalıştır: bash deploy.sh
# Konum: /home/funbreak/funbreakseo/

set -e

APP_DIR="/home/funbreak/funbreakseo"
cd "$APP_DIR"

echo "=========================================="
echo " FunBreak SEO — Production Deploy"
echo "=========================================="

# 1. En son kodu çek
echo "[1/6] Pulling latest code..."
git pull origin master

# 2. Bağımlılıkları yükle
echo "[2/6] Installing dependencies..."
pnpm install --frozen-lockfile

# 3. Prisma client oluştur
echo "[3/6] Generating Prisma client..."
pnpm --filter @funbreakseo/database generate

# 4. Veritabanı migration (production-safe, geri alınamaz değişiklik olmaz)
echo "[4/6] Running database migrations..."
pnpm --filter @funbreakseo/database migrate:deploy

# 5. Tüm uygulamaları build et
echo "[5/6] Building all apps (api, web, admin)..."
pnpm build

# 6. PM2 süreçlerini yeniden başlat
echo "[6/6] Restarting PM2 processes..."
mkdir -p "$APP_DIR/logs"

# ecosystem.config.js ile tüm süreçleri yönet
if pm2 list | grep -q "fb-api"; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi

pm2 save

echo ""
echo "=========================================="
echo " Deploy tamamlandı!"
echo "=========================================="
echo ""
pm2 status
echo ""
echo "Loglar için: pm2 logs"
echo "API health: curl https://api.funbreakseo.com/health"
