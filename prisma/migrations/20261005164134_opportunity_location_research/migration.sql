-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN "location" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "research" JSONB;
ALTER TABLE "Opportunity" ADD COLUMN "researchFetchedAt" DATETIME;
