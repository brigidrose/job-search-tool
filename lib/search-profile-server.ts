import type { Prisma } from "@/app/generated/prisma/client";
import type { Db } from "@/lib/db";
import {
  DEFAULT_PROFILE,
  REMOTE,
  type SearchProfile,
  type SearchProfileInput,
} from "@/lib/search-profile";

const USER_ID = "default";
const MAX_ITEMS = 40;
const MAX_LENGTH = 200;

type Row = Prisma.SearchProfileGetPayload<object>;

function toProfile(row: Row): SearchProfile {
  return {
    id: row.id,
    name: row.name,
    jobTitles: row.jobTitles as string[],
    industries: row.industries as string[],
    geographies: row.geographies as string[],
    allowRemote: row.allowRemote,
    companyStages: row.companyStages as string[],
    minSalary: row.minSalary,
    maxSalary: row.maxSalary,
    customDorks: row.customDorks as string[],
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Returns the saved profile, creating it with defaults on first use. */
export async function getSearchProfile(db: Db): Promise<SearchProfile> {
  const row = await db.searchProfile.upsert({
    where: { userId: USER_ID },
    update: {},
    create: { userId: USER_ID, ...DEFAULT_PROFILE },
  });
  return toProfile(row);
}

/** Looks a profile up by id; "default" (or no id) means the user's profile. */
export async function findSearchProfile(db: Db, id: string | null) {
  const profile = await getSearchProfile(db);
  return !id || id === "default" || id === profile.id ? profile : null;
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`${field} must be a list of text values`);
  }
  // Trim, drop blanks, and de-duplicate case-insensitively, keeping first spelling.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value as string[]) {
    const item = raw.trim().slice(0, MAX_LENGTH);
    if (item && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase());
      out.push(item);
    }
  }
  return out.slice(0, MAX_ITEMS);
}

function salary(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) {
    throw new Error(`${field} must be a whole dollar amount`);
  }
  return n;
}

/** Validates request JSON. Throws an Error with a user-facing message. */
export function parseProfileInput(body: unknown): SearchProfileInput {
  if (!body || typeof body !== "object") throw new Error("Invalid JSON body");
  const b = body as Record<string, unknown>;

  const geographies = stringList(b.geographies ?? [], "geographies");
  const minSalary = salary(b.minSalary, "minSalary");
  const maxSalary = salary(b.maxSalary, "maxSalary");
  if (minSalary !== null && maxSalary !== null && minSalary > maxSalary) {
    throw new Error("Minimum salary can't be higher than maximum salary");
  }

  return {
    name:
      typeof b.name === "string" && b.name.trim()
        ? b.name.trim().slice(0, MAX_LENGTH)
        : DEFAULT_PROFILE.name,
    jobTitles: stringList(b.jobTitles ?? [], "jobTitles"),
    industries: stringList(b.industries ?? [], "industries"),
    // "Remote" as a geography means the same as the allowRemote toggle.
    geographies: geographies.filter((g) => g.toLowerCase() !== REMOTE.toLowerCase()),
    allowRemote:
      b.allowRemote === true ||
      geographies.some((g) => g.toLowerCase() === REMOTE.toLowerCase()),
    companyStages: stringList(b.companyStages ?? [], "companyStages"),
    minSalary,
    maxSalary,
    customDorks: stringList(b.customDorks ?? [], "customDorks"),
  };
}

export async function saveSearchProfile(
  db: Db,
  input: SearchProfileInput,
): Promise<SearchProfile> {
  const row = await db.searchProfile.upsert({
    where: { userId: USER_ID },
    update: input,
    create: { userId: USER_ID, ...input },
  });
  return toProfile(row);
}
