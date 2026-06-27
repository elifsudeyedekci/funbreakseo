-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "gscAccessToken" TEXT;
ALTER TABLE "organizations" ADD COLUMN "gscRefreshToken" TEXT;
ALTER TABLE "organizations" ADD COLUMN "gscTokenExpiry" TIMESTAMP(3);
