// One-time copy of the old local SQLite data (dev.db) into Postgres.
// Usage: npm run db:import [-- path/to/dev.db]
// Safe to run more than once: rows that already exist are skipped.
import "dotenv/config";
import Database from "better-sqlite3";
import type { Prisma } from "../app/generated/prisma/client";
import { ownerDb } from "../lib/db";

type Row = Record<string, unknown>;

const file = process.argv[2] ?? "dev.db";
const sqlite = new Database(file, { readonly: true, fileMustExist: true });

function rows(table: string): Row[] {
  const exists = sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return exists ? (sqlite.prepare(`SELECT * FROM "${table}"`).all() as Row[]) : [];
}

// SQLite stored dates as ISO text (or epoch milliseconds), booleans as 0/1,
// and JSON as text.
const date = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string | number));
const bool = (v: unknown) => v === 1 || v === true;
const json = (v: unknown) =>
  (v === null || v === undefined ? null : JSON.parse(String(v))) as Prisma.InputJsonValue;

async function main() {
  const templates = await ownerDb.template.createMany({
    data: rows("Template") as Prisma.TemplateCreateManyInput[],
    skipDuplicates: true,
  });

  const opportunities = await ownerDb.opportunity.createMany({
    data: rows("Opportunity").map((r) => ({
      ...r,
      dateFound: date(r.dateFound)!,
      dateApplied: date(r.dateApplied),
      createdAt: date(r.createdAt)!,
      updatedAt: date(r.updatedAt)!,
      research: r.research == null ? undefined : json(r.research),
      researchFetchedAt: date(r.researchFetchedAt),
    })) as Prisma.OpportunityCreateManyInput[],
    skipDuplicates: true,
  });

  const leads = await ownerDb.formDLead.createMany({
    data: rows("FormDLead").map((r) => ({
      ...r,
      dateOfFirstSale: date(r.dateOfFirstSale),
      dateFiled: date(r.dateFiled)!,
      createdAt: date(r.createdAt)!,
      principals: json(r.principals),
      suggestedEmails: json(r.suggestedEmails),
      isSoutheast: bool(r.isSoutheast),
      remoteFriendly: bool(r.remoteFriendly),
    })) as Prisma.FormDLeadCreateManyInput[],
    skipDuplicates: true,
  });

  const scanDays = await ownerDb.formDScanDay.createMany({
    data: rows("FormDScanDay").map((r) => ({
      ...r,
      scannedAt: date(r.scannedAt)!,
    })) as Prisma.FormDScanDayCreateManyInput[],
    skipDuplicates: true,
  });

  const profiles = await ownerDb.searchProfile.createMany({
    data: rows("SearchProfile").map((r) => ({
      ...r,
      jobTitles: json(r.jobTitles),
      industries: json(r.industries),
      geographies: json(r.geographies),
      companyStages: json(r.companyStages),
      customDorks: json(r.customDorks),
      allowRemote: bool(r.allowRemote),
      createdAt: date(r.createdAt)!,
      updatedAt: date(r.updatedAt)!,
    })) as Prisma.SearchProfileCreateManyInput[],
    skipDuplicates: true,
  });

  console.log(`Imported from ${file}:`);
  console.log(`  ${opportunities.count} opportunities`);
  console.log(`  ${leads.count} Form D leads`);
  console.log(`  ${scanDays.count} scanned days`);
  console.log(`  ${templates.count} templates`);
  console.log(`  ${profiles.count} search profile`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => ownerDb.$disconnect());
