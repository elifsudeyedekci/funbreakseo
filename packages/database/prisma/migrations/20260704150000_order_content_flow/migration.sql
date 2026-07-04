-- Backlink siparişi yeni akışı: konu + 3 link (2 kelime + 1 marka) + AI blog taslağı + müşteri onay/düzeltme
ALTER TABLE "backlink_orders" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE "backlink_orders" ADD COLUMN IF NOT EXISTS "links" JSONB;
ALTER TABLE "backlink_orders" ADD COLUMN IF NOT EXISTS "contentDraft" TEXT;
ALTER TABLE "backlink_orders" ADD COLUMN IF NOT EXISTS "revisionNote" TEXT;
ALTER TABLE "backlink_orders" ADD COLUMN IF NOT EXISTS "contentApprovedAt" TIMESTAMP(3);
