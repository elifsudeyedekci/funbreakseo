-- AlterTable
-- Not modeled in schema.prisma on purpose — written/read via $executeRaw/$queryRaw
-- (see AuthService.autoDetectGa4Property / auth.controller.ts google/callback).
ALTER TABLE "organizations" ADD COLUMN "ga4PropertyId" TEXT;
