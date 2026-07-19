-- AlterEnum
ALTER TYPE "IssueCategory" ADD VALUE 'PERFORMANCE';
ALTER TYPE "IssueCategory" ADD VALUE 'USABILITY';
ALTER TYPE "IssueCategory" ADD VALUE 'SOCIAL';
ALTER TYPE "IssueCategory" ADD VALUE 'TECHNOLOGY';
ALTER TYPE "IssueCategory" ADD VALUE 'LOCAL_SEO';

-- AlterTable
ALTER TABLE "backlinks" ADD COLUMN "sourceTitle" TEXT,
ADD COLUMN "pageRating" INTEGER,
ADD COLUMN "isEdu" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isGov" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "country" TEXT,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "subnet" TEXT,
ADD COLUMN "toxicScore" INTEGER;

-- CreateTable
CREATE TABLE "backlink_history" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalBacklinks" INTEGER NOT NULL DEFAULT 0,
    "referringDomains" INTEGER NOT NULL DEFAULT 0,
    "newBacklinks" INTEGER NOT NULL DEFAULT 0,
    "lostBacklinks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backlink_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "backlink_history_projectId_date_key" ON "backlink_history"("projectId", "date");

-- CreateIndex
CREATE INDEX "backlink_history_projectId_idx" ON "backlink_history"("projectId");

-- AddForeignKey
ALTER TABLE "backlink_history" ADD CONSTRAINT "backlink_history_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "site_audit_reports" (
    "id" TEXT NOT NULL,
    "crawlJobId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "overallGrade" TEXT NOT NULL DEFAULT 'F',
    "categoryScores" JSONB,
    "recommendationsCount" INTEGER NOT NULL DEFAULT 0,
    "recommendations" JSONB,
    "onPageJson" JSONB,
    "geoJson" JSONB,
    "performanceJson" JSONB,
    "usabilityJson" JSONB,
    "socialJson" JSONB,
    "technologyJson" JSONB,
    "localSeoJson" JSONB,
    "crawlListJson" JSONB,
    "screenshotDesktopUrl" TEXT,
    "screenshotMobileUrl" TEXT,
    "screenshotTabletUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_audit_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_audit_reports_crawlJobId_key" ON "site_audit_reports"("crawlJobId");

-- CreateIndex
CREATE INDEX "site_audit_reports_projectId_idx" ON "site_audit_reports"("projectId");

-- AddForeignKey
ALTER TABLE "site_audit_reports" ADD CONSTRAINT "site_audit_reports_crawlJobId_fkey" FOREIGN KEY ("crawlJobId") REFERENCES "crawl_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_audit_reports" ADD CONSTRAINT "site_audit_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "feature_usage_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feature_usage_logs_organizationId_feature_createdAt_idx" ON "feature_usage_logs"("organizationId", "feature", "createdAt");

-- AddForeignKey
ALTER TABLE "feature_usage_logs" ADD CONSTRAINT "feature_usage_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
