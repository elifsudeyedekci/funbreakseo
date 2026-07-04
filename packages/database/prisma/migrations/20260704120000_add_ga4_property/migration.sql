-- GA4 entegrasyonu: projeye Analytics property kimliği
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "ga4PropertyId" TEXT;
