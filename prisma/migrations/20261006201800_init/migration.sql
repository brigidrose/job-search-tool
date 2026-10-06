-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('found', 'applied', 'outreach_sent', 'response_received', 'interview', 'offer', 'rejected', 'no_response');

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "jobUrl" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "source" TEXT,
    "location" TEXT,
    "dateFound" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateApplied" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'found',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "newsQuery" TEXT,
    "research" JSONB,
    "researchFetchedAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormDLead" (
    "id" TEXT NOT NULL,
    "cik" TEXT NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT,
    "industry" TEXT,
    "entityType" TEXT,
    "totalOfferingAmount" DOUBLE PRECISION,
    "totalAmountSold" DOUBLE PRECISION,
    "dateOfFirstSale" TIMESTAMP(3),
    "dateFiled" TIMESTAMP(3) NOT NULL,
    "principals" JSONB NOT NULL,
    "guessedDomain" TEXT,
    "suggestedEmails" JSONB NOT NULL,
    "isSoutheast" BOOLEAN NOT NULL DEFAULT false,
    "remoteFriendly" BOOLEAN NOT NULL DEFAULT false,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormDLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormDScanDay" (
    "date" TEXT NOT NULL,
    "filingsSeen" INTEGER NOT NULL,
    "leadsAdded" INTEGER NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormDScanDay_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "SearchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'My Search Profile',
    "jobTitles" JSONB NOT NULL,
    "industries" JSONB NOT NULL,
    "geographies" JSONB NOT NULL,
    "allowRemote" BOOLEAN NOT NULL DEFAULT true,
    "companyStages" JSONB NOT NULL,
    "minSalary" INTEGER,
    "maxSalary" INTEGER,
    "customDorks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastResetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormDLead_cik_key" ON "FormDLead"("cik");

-- CreateIndex
CREATE UNIQUE INDEX "FormDLead_accessionNumber_key" ON "FormDLead"("accessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FormDLead_opportunityId_key" ON "FormDLead"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchProfile_userId_key" ON "SearchProfile"("userId");

-- CreateIndex
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "FormDLead" ADD CONSTRAINT "FormDLead_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
