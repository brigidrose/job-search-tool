import { promises as dns } from "node:dns";

// Form D has no website or email fields, so contacts are best-effort guesses
// for the user to verify before reaching out.

const LEGAL_SUFFIXES =
  /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|ltd|limited|pbc|plc|lp|l\.p|holdings?|technologies|group)\b\.?/gi;

export function domainStem(companyName: string) {
  return companyName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\(.*?\)/g, "")
    .replace(LEGAL_SUFFIXES, "")
    .replace(/[^a-z0-9]/g, "");
}

async function hasMailServer(domain: string) {
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    return records.length > 0;
  } catch {
    return false;
  }
}

/**
 * Guesses the company's email domain from its name: the first of
 * name.com / name.ai / name.io that accepts mail. Returns null if none do.
 */
export async function guessDomain(companyName: string) {
  const stem = domainStem(companyName);
  if (stem.length < 3) return null;
  for (const tld of ["com", "ai", "io"]) {
    const domain = `${stem}.${tld}`;
    if (await hasMailServer(domain)) return domain;
  }
  return null;
}

export function suggestedEmails(domain: string | null) {
  return domain ? [`careers@${domain}`, `hiring@${domain}`] : [];
}
