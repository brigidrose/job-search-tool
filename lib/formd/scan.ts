// Scans always write to the owner's data; the demo copies leads from there.
import { ownerDb as prisma } from "@/lib/db";
import {
  fetchFormDFiling,
  fetchFormDIndex,
  resetPublishedDates,
  type IndexEntry,
} from "./edgar";
import { guessDomain, suggestedEmails } from "./contacts";
import { SOUTHEAST_STATES, looksLikeFundName, rejectFiling } from "./filters";

export type ScanResult = {
  daysScanned: string[];
  filingsSeen: number;
  leadsAdded: number;
  skipped: { fund: number; amount: number; first_sale: number; duplicate: number };
  errors: string[];
};

function ymd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function parseYmd(s: string) {
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
}

const CONCURRENCY = 4;

async function mapLimit<T>(items: T[], fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

/**
 * Scans EDGAR daily indexes for the past `days` days (not including today,
 * whose index isn't published until tonight). Days already scanned are skipped,
 * so running this repeatedly is safe.
 */
export async function scanFormD({ days = 7, log = console.log } = {}): Promise<ScanResult> {
  resetPublishedDates();
  const today = new Date();
  const candidates: string[] = [];
  for (let d = 1; d <= days; d++) {
    candidates.push(ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - d)));
  }
  const done = new Set(
    (await prisma.formDScanDay.findMany({ where: { date: { in: candidates } } })).map(
      (r) => r.date,
    ),
  );

  const result: ScanResult = {
    daysScanned: [],
    filingsSeen: 0,
    leadsAdded: 0,
    skipped: { fund: 0, amount: 0, first_sale: 0, duplicate: 0 },
    errors: [],
  };

  for (const date of candidates.filter((d) => !done.has(d)).reverse()) {
    const entries = await fetchFormDIndex(date);
    if (entries === null) {
      // No index: a weekend/holiday, or not published yet. Only remember
      // older dates so a late-published index still gets picked up.
      const ageDays = (today.getTime() - parseYmd(date).getTime()) / 86_400_000;
      const weekend = [0, 6].includes(parseYmd(date).getDay());
      if (weekend || ageDays > 4) {
        await prisma.formDScanDay.create({ data: { date, filingsSeen: 0, leadsAdded: 0 } });
      }
      log(`${date}: no index`);
      continue;
    }

    const known = new Set(
      (
        await prisma.formDLead.findMany({
          where: { cik: { in: entries.map((e) => e.cik) } },
          select: { cik: true },
        })
      ).map((l) => l.cik),
    );

    let added = 0;
    let dayErrors = 0;
    const toFetch: IndexEntry[] = [];
    for (const entry of entries) {
      if (known.has(entry.cik)) result.skipped.duplicate++;
      else if (looksLikeFundName(entry.companyName)) result.skipped.fund++;
      else toFetch.push(entry);
    }

    await mapLimit(toFetch, async (entry) => {
      try {
        const filing = await fetchFormDFiling(entry);
        const rejection = rejectFiling(filing, today);
        if (rejection) {
          result.skipped[rejection]++;
          return;
        }
        const domain = await guessDomain(filing.companyName);
        await prisma.formDLead.create({
          data: {
            cik: filing.cik,
            accessionNumber: filing.accessionNumber,
            companyName: filing.companyName,
            city: filing.city,
            state: filing.state,
            phone: filing.phone,
            industry: filing.industry,
            entityType: filing.entityType,
            totalOfferingAmount: filing.totalOfferingAmount,
            totalAmountSold: filing.totalAmountSold,
            // Calendar dates, stored as UTC midnight.
            dateOfFirstSale: filing.dateOfFirstSale ? new Date(filing.dateOfFirstSale) : null,
            dateFiled: new Date(
              `${entry.dateFiled.slice(0, 4)}-${entry.dateFiled.slice(4, 6)}-${entry.dateFiled.slice(6, 8)}`,
            ),
            principals: filing.principals,
            guessedDomain: domain,
            suggestedEmails: suggestedEmails(domain),
            isSoutheast: filing.state !== null && SOUTHEAST_STATES.has(filing.state),
          },
        });
        added++;
      } catch (err) {
        // A company that files twice in one day hits the unique CIK constraint.
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          result.skipped.duplicate++;
          return;
        }
        dayErrors++;
        result.errors.push(`${entry.companyName}: ${err instanceof Error ? err.message : err}`);
      }
    });

    result.filingsSeen += entries.length;
    result.leadsAdded += added;
    // Leave days with failures unrecorded so the next scan retries them;
    // the unique CIK keeps already-saved leads from duplicating.
    if (dayErrors === 0) {
      await prisma.formDScanDay.create({
        data: { date, filingsSeen: entries.length, leadsAdded: added },
      });
      result.daysScanned.push(date);
    }
    log(`${date}: ${entries.length} Form D filings, ${added} new leads, ${dayErrors} errors`);
  }

  return result;
}
