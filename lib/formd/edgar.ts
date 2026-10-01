import { XMLParser } from "fast-xml-parser";

// SEC fair-access policy: declare who you are and stay under 10 requests/sec.
// https://www.sec.gov/os/accessing-edgar-data
const MIN_INTERVAL_MS = 125; // 8 req/s
let nextSlot = 0;

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

export async function secFetch(url: string): Promise<Response> {
  const userAgent = process.env.SEC_USER_AGENT?.trim();
  if (!userAgent) {
    throw new Error(
      'SEC_USER_AGENT is not set. Add SEC_USER_AGENT="Your Name you@example.com" to .env',
    );
  }
  await throttle();
  return fetch(url, { headers: { "User-Agent": userAgent } });
}

export type IndexEntry = {
  formType: string;
  companyName: string;
  cik: string;
  dateFiled: string; // YYYYMMDD
  accessionNumber: string; // 0001234567-26-000123
};

function quarter(date: string) {
  return Math.floor((Number(date.slice(4, 6)) - 1) / 3) + 1;
}

// EDGAR answers 403 (not 404) for index files that don't exist, so check the
// quarter's directory listing to tell "no filings that day" from a real error.
const publishedDates = new Map<string, Promise<Set<string>>>();

/** Call at the start of each scan so newly published days show up. */
export function resetPublishedDates() {
  publishedDates.clear();
}

function listPublishedDates(year: string, qtr: number) {
  const key = `${year}/QTR${qtr}`;
  if (!publishedDates.has(key)) {
    const promise = (async () => {
      const res = await secFetch(`https://www.sec.gov/Archives/edgar/daily-index/${key}/index.json`);
      if (res.status === 403 || res.status === 404) return new Set<string>(); // quarter not started
      if (!res.ok) throw new Error(`EDGAR listing ${key}: HTTP ${res.status}`);
      const data = (await res.json()) as { directory: { item: { name: string }[] } };
      return new Set(
        data.directory.item
          .map((i) => i.name.match(/^form\.(\d{8})\.idx$/)?.[1])
          .filter((d): d is string => d !== undefined),
      );
    })();
    promise.catch(() => publishedDates.delete(key)); // retry on the next scan
    publishedDates.set(key, promise);
  }
  return publishedDates.get(key)!;
}

/**
 * Lists every original Form D (not D/A amendments) in one EDGAR daily index.
 * Returns null when no index exists for that date (weekends, holidays, or not
 * yet published).
 */
export async function fetchFormDIndex(date: string): Promise<IndexEntry[] | null> {
  const year = date.slice(0, 4);
  const qtr = quarter(date);
  if (!(await listPublishedDates(year, qtr)).has(date)) return null;

  const res = await secFetch(
    `https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${qtr}/form.${date}.idx`,
  );
  if (res.status === 403) {
    throw new Error(
      "SEC rejected the request (403). It may be rate limiting (wait ~10 minutes) or SEC_USER_AGENT in .env may be invalid",
    );
  }
  if (!res.ok) throw new Error(`EDGAR index ${date}: HTTP ${res.status}`);

  const entries: IndexEntry[] = [];
  for (const line of (await res.text()).split("\n")) {
    // Columns are separated by runs of 2+ spaces; file name ends in <accession>.txt.
    const match = line.match(
      /^(\S+(?: \S+)*)\s{2,}(.+?)\s{2,}(\d+)\s+(\d{8})\s+edgar\/data\/\d+\/([\d-]+)\.txt/,
    );
    if (match && match[1] === "D") {
      entries.push({
        formType: match[1],
        companyName: match[2].trim(),
        cik: match[3],
        dateFiled: match[4],
        accessionNumber: match[5],
      });
    }
  }
  return entries;
}

export type Principal = { name: string; relationships: string[] };

export type FormDFiling = {
  cik: string;
  accessionNumber: string;
  companyName: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  entityType: string | null;
  industry: string | null;
  isPooledFund: boolean;
  totalOfferingAmount: number | null; // null = "Indefinite"
  totalAmountSold: number | null;
  dateOfFirstSale: string | null; // YYYY-MM-DD; null when yet to occur
  principals: Principal[];
};

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false, // keep CIKs, zips, and amounts as strings
  trimValues: true,
  isArray: (name) => ["relatedPersonInfo", "relationship"].includes(name),
});

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function amount(value: unknown): number | null {
  const n = Number(text(value));
  return Number.isFinite(n) ? n : null;
}

export function filingUrl(cik: string, accessionNumber: string) {
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionNumber.replace(/-/g, "")}/`;
}

export async function fetchFormDFiling(entry: IndexEntry): Promise<FormDFiling> {
  const res = await secFetch(`${filingUrl(entry.cik, entry.accessionNumber)}primary_doc.xml`);
  if (!res.ok) {
    throw new Error(`Form D ${entry.accessionNumber}: HTTP ${res.status}`);
  }
  const doc = parser.parse(await res.text())?.edgarSubmission;
  if (!doc) throw new Error(`Form D ${entry.accessionNumber}: unexpected XML`);

  const issuer = doc.primaryIssuer ?? {};
  const offering = doc.offeringData ?? {};
  const people: unknown[] = doc.relatedPersonsList?.relatedPersonInfo ?? [];

  return {
    cik: entry.cik,
    accessionNumber: entry.accessionNumber,
    companyName: text(issuer.entityName) ?? entry.companyName,
    city: text(issuer.issuerAddress?.city),
    state: text(issuer.issuerAddress?.stateOrCountry),
    phone: text(issuer.issuerPhoneNumber),
    entityType: text(issuer.entityType),
    industry: text(offering.industryGroup?.industryGroupType),
    isPooledFund: offering.industryGroup?.investmentFundInfo !== undefined,
    totalOfferingAmount: amount(offering.offeringSalesAmounts?.totalOfferingAmount),
    totalAmountSold: amount(offering.offeringSalesAmounts?.totalAmountSold),
    dateOfFirstSale: text(offering.typeOfFiling?.dateOfFirstSale?.value),
    principals: people.map((p) => {
      const person = p as {
        relatedPersonName?: { firstName?: unknown; middleName?: unknown; lastName?: unknown };
        relatedPersonRelationshipList?: { relationship?: unknown[] };
      };
      const n = person.relatedPersonName ?? {};
      return {
        name: [n.firstName, n.middleName, n.lastName].map(text).filter(Boolean).join(" "),
        relationships: (person.relatedPersonRelationshipList?.relationship ?? [])
          .map(text)
          .filter((r): r is string => r !== null),
      };
    }),
  };
}
