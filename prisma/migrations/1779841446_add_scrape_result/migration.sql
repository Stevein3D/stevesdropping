-- CreateTable "scrape_results"
CREATE TABLE "scrape_results" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL,
    "diffs" JSONB NOT NULL,
    "approvedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scrape_results_pkey" PRIMARY KEY ("id")
);
