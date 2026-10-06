-- CreateTable
CREATE TABLE "SearchProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchProfile_userId_key" ON "SearchProfile"("userId");
