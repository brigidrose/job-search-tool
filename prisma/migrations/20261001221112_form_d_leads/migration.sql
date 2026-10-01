-- CreateTable
CREATE TABLE "FormDLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cik" TEXT NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT,
    "industry" TEXT,
    "entityType" TEXT,
    "totalOfferingAmount" REAL,
    "totalAmountSold" REAL,
    "dateOfFirstSale" DATETIME,
    "dateFiled" DATETIME NOT NULL,
    "principals" JSONB NOT NULL,
    "guessedDomain" TEXT,
    "suggestedEmails" JSONB NOT NULL,
    "isSoutheast" BOOLEAN NOT NULL DEFAULT false,
    "remoteFriendly" BOOLEAN NOT NULL DEFAULT false,
    "opportunityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormDLead_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormDScanDay" (
    "date" TEXT NOT NULL PRIMARY KEY,
    "filingsSeen" INTEGER NOT NULL,
    "leadsAdded" INTEGER NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "FormDLead_cik_key" ON "FormDLead"("cik");

-- CreateIndex
CREATE UNIQUE INDEX "FormDLead_accessionNumber_key" ON "FormDLead"("accessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FormDLead_opportunityId_key" ON "FormDLead"("opportunityId");
