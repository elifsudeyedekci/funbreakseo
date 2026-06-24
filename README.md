# FunBreak SEO — Full-Stack SEO + GEO SaaS Platform

**Tam otomatik SEO + GEO optimizasyon platformu.** Google ve yapay zeka aramalarında (ChatGPT, Gemini, Perplexity, AI Overviews) görünürlüğü ölçen ve artıran, backlink market + outreach motoruyla büyüyen SaaS.

**Şirket:** FunBreak Global Teknoloji Ltd. Şti. (İstanbul)  
**Web:** https://funbreakseo.com | **Admin:** https://admin.funbreakseo.com | **API:** https://api.funbreakseo.com  
**Destek:** 0533 448 82 53 | destek@funbreakseo.com

---

## Monorepo Yapısı

```
funbreakseo/
├── apps/
│   ├── api/          NestJS backend (port 4000)
│   ├── web/          Next.js 15 landing + müşteri paneli (port 3000)
│   └── admin/        Next.js 15 admin paneli (port 3001)
├── packages/
│   ├── database/     Prisma schema + migrations + seed
│   ├── shared/       Ortak tipler, zod şemaları, sabitler
│   ├── ui/           React component library (koyu tema)
│   └── config/       ESLint + TSConfig + Tailwind configs
├── docker-compose.yml (lokal geliştirme — postgres + redis)
├── nginx.conf         Sunucu nginx config
├── ecosystem.config.js PM2 process tanımları
└── deploy.sh          Production deploy script
```

---

## Hızlı Başlangıç (Geliştirme)

### Ön koşullar
- Node.js 22+
- pnpm 9+
- Docker Desktop (PostgreSQL + Redis için)

### 1. Klonla ve bağımlılıkları yükle
```bash
git clone https://github.com/funbreakseo/funbreakseo.git
cd funbreakseo
pnpm install
```

### 2. Environment değişkenlerini ayarla
```bash
cp .env.example .env
# .env dosyasını düzenle (DB, Redis, API anahtarları)
```

### 3. Docker ile veritabanı başlat
```bash
docker-compose up -d
```

### 4. Veritabanı migrate + seed
```bash
pnpm db:generate    # Prisma client oluştur
pnpm db:migrate     # Migrations çalıştır
pnpm db:seed        # Seed data yükle (planlar, SEO kuralları, bloglar)
```

### 5. Geliştirme sunucusu başlat
```bash
pnpm dev
# api → http://localhost:4000
# web → http://localhost:3000
# admin → http://localhost:3001
# Swagger → http://localhost:4000/api/docs
```

---

## Production Deploy (Contabo Sunucu)

### Sunucu gereksinimleri
- Ubuntu 24.04, 8 vCPU, 24GB RAM
- Node.js 22, PostgreSQL 16, Redis 7, Nginx, PM2, Certbot

### Nginx kurulum
```bash
sudo cp nginx.conf /etc/nginx/sites-available/funbreakseo
sudo ln -s /etc/nginx/sites-available/funbreakseo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### SSL sertifikası
```bash
sudo certbot --nginx -d funbreakseo.com -d www.funbreakseo.com -d admin.funbreakseo.com -d api.funbreakseo.com
```

### İlk Deploy
```bash
git clone <repo> /home/funbreak/funbreakseo
cd /home/funbreak/funbreakseo
cp .env.example .env
# .env doldurul
pnpm install
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Güncellemeler
```bash
cd /home/funbreak/funbreakseo
./deploy.sh
```

---

## Environment Değişkenleri

| Değişken | Açıklama | Nereden Alınır |
|---|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı URL'i | Sunucu DB |
| `REDIS_HOST/PORT` | Redis sunucu bilgisi | Sunucu Redis |
| `JWT_ACCESS_SECRET` | JWT imzalama secret (min 32 karakter) | Rastgele üret |
| `JWT_REFRESH_SECRET` | Refresh token secret | Rastgele üret |
| `DATAFORSEO_LOGIN` | DataForSEO API kullanıcı adı | app.dataforseo.com |
| `DATAFORSEO_PASSWORD` | DataForSEO API şifresi | app.dataforseo.com |
| `ANTHROPIC_API_KEY` | Claude API anahtarı | console.anthropic.com |
| `OPENAI_API_KEY` | OpenAI API anahtarı (fallback) | platform.openai.com |
| `GOOGLE_OAUTH_CLIENT_ID/SECRET` | GSC entegrasyonu | console.cloud.google.com |
| `VAKIFBANK_MERCHANT_ID` | VakıfBank Sanal POS üye işyeri no | VakıfBank kurumsal |
| `VAKIFBANK_TERMINAL_NO` | Terminal numarası | VakıfBank |
| `VAKIFBANK_PASSWORD` | Sanal POS şifresi | VakıfBank |
| `VAKIFBANK_3DSECURE_KEY` | 3D Secure imzalama anahtarı | VakıfBank |
| `PARASUT_CLIENT_ID/SECRET` | Paraşüt API | uygulama.parasut.com/oauth |
| `PARASUT_USERNAME/PASSWORD` | Paraşüt hesabı | Paraşüt |
| `PARASUT_COMPANY_ID` | Şirket ID | Paraşüt dashboard |
| `SMTP_HOST/PORT/USER/PASS` | E-posta SMTP | Kendi mail sunucusu |
| `EXCHANGE_RATE_API_KEY` | Döviz kuru API | exchangerate-api.com |
| `ADMIN_EMAIL` | Admin bildirim maili | doganizzetcan@gmail.com |

---

## Önemli Notlar

### VakıfBank Sanal POS Test
- Test URL: `https://onlineodemetest.vakifbank.com.tr`
- Canlı URL: `https://onlineodeme.vakifbank.com.tr`
- `VAKIFBANK_BASE_URL` değişkeniyle kontrol et

### DataForSEO Sandbox
- `DATAFORSEO_USE_SANDBOX=true` → sandbox (ücretsiz test)
- `DATAFORSEO_USE_SANDBOX=false` → canlı (ücretli)

### Autopilot
- Başlangıçta `isActive: false` (seed'den kapalı gelir)
- Admin panelden → /autopilot → Ayarlar → Aktif Et

### İlk Admin Hesabı
- Seed sonrası: `admin@funbreakseo.com` / `Admin123!`
- İlk girişte şifreyi değiştir!

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | NestJS 10, TypeScript, Prisma 5, BullMQ |
| Frontend | Next.js 15, React 19, TanStack Query, Zustand |
| Stil | Tailwind CSS v4, shadcn/ui (özelleştirilmiş) |
| Veritabanı | PostgreSQL 16, Redis 7 |
| Ödeme | VakıfBank Sanal POS (primary), Stripe (hazır-pasif) |
| Fatura | Paraşüt e-fatura |
| AI/LLM | Anthropic Claude, OpenAI GPT-4 (fallback) |
| SEO Data | DataForSEO (SERP, kelime, backlink, GEO/LLM Mentions) |
| Mail | Nodemailer + MJML şablonlar |
| Realtime | Socket.io |
| PWA | Next.js PWA (manifest + service worker) |
| i18n | next-intl (8 dil: TR/EN/DE/FR/ES/AR/RU/HI) |
| Deploy | PM2 + Nginx + Certbot (Contabo VPS) |

---

## Özellik Özeti

- ✅ Teknik SEO Tarama (150+ kural, Playwright crawler)
- ✅ Anahtar Kelime Takibi (günlük SERP, AI Overview tespiti)
- ✅ AI İçerik Motoru (SEO+GEO uyumlu blog/içerik üretimi)
- ✅ GEO / AI Görünürlük (ChatGPT/Gemini/Perplexity mention+citation)
- ✅ Backlink Market (escrow, admin onaylı, DR doğrulamalı)
- ✅ Outreach Motoru (otomatik mail, takip dizisi, cevap sınıflandırma)
- ✅ Autopilot İçerik (kendi kendini büyüten blog motoru, 8 dil)
- ✅ Çok Dilli (8 dil, Arapça RTL, Hintçe Devanagari)
- ✅ Çok Para Birimi (TRY/USD/EUR/GBP/SAR/AED/RUB, canlı kur)
- ✅ VakıfBank 3D Secure Ödeme
- ✅ Paraşüt e-Fatura Entegrasyonu
- ✅ KVKK/GDPR Uyumlu (ConsentRecord, yasal sayfalar, veri silme)
- ✅ Affiliate Programı
- ✅ Müşteriye Açık API
- ✅ WhatsApp Destek Butonu (tüm sayfalarda)
- ✅ PWA (mobil ana ekrana eklenebilir)
- ✅ Maliyet Kontrol Merkezi (API harcama limitleri)
- ✅ Admin Finansal Bildirimler (haftalık özet + her satış)

---

## Gerçekçi Beklentiler

**Teknik mükemmellik baştan yapılmıştır:** Core Web Vitals, schema markup, hreflang, sitemap, canonical, i18n — hepsi kurulu.

**Sıralama zamanla gelir:** Google'da sıralama için zaman + domain otoritesi + rekabet faktörleri gerekir. Yeni domain "seo" gibi rekabetçi bir kelimede ilk günden 1. olamaz. Düşük rekabetli uzun kuyruklu kelimeler (örn. "yapay zeka seo aracı") önce öne çıkar. Autopilot motoru bu büyümeyi sürekli besler.

*FunBreak Global Teknoloji Ltd. Şti. — funbreakseo.com*
