-- CreateTable
CREATE TABLE "scan_history" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "pagesScanned" INTEGER NOT NULL DEFAULT 0,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "keywordCount" INTEGER NOT NULL DEFAULT 0,
    "rankedCount" INTEGER NOT NULL DEFAULT 0,
    "firstPageCount" INTEGER NOT NULL DEFAULT 0,
    "avgPosition" DOUBLE PRECISION,
    "backlinkCount" INTEGER NOT NULL DEFAULT 0,
    "referringDomains" INTEGER NOT NULL DEFAULT 0,
    "geoVisibilityScore" INTEGER NOT NULL DEFAULT 0,
    "geoMentions" INTEGER NOT NULL DEFAULT 0,
    "geoCitations" INTEGER NOT NULL DEFAULT 0,
    "competitorCount" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scan_history_projectId_createdAt_idx" ON "scan_history"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
