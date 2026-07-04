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

# PDF raporları için puppeteer Chromium kullanır. İlk kurulumda bir kez
# sistem kütüphaneleri gerekir (root ile):
#   sudo apt-get install -y libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 \
#     libcups2t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
#     libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2
# Kurulu değilse sistem çalışmaya devam eder; raporlar PDF yerine
# yazdırılabilir HTML olarak üretilir (otomatik fallback).

# 3. Prisma client oluştur
echo "[3/6] Generating Prisma client..."
pnpm --filter @funbreakseo/database generate

# 4. Veritabanı migration (production-safe, geri alınamaz değişiklik olmaz)
echo "[4/6] Running database migrations..."
pnpm --filter @funbreakseo/database migrate:deploy

# 4b. Opsiyonel seed: `bash deploy.sh --seed` ile çalışır.
# Blog içerikleri, planlar, SEO kuralları vb. upsert edilir.
# DİKKAT: Admin panelden düzenlenen blog yazılarının üzerine seed içeriği yazılır.
if [[ "${1:-}" == "--seed" ]]; then
  echo "[4b] Seeding database (content upsert)..."
  pnpm --filter @funbreakseo/database seed
fi

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
