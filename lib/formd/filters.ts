import type { FormDFiling } from "./edgar";

export const MIN_RAISE = 3_000_000;
export const MAX_RAISE = 50_000_000;
export const FIRST_SALE_WINDOW_DAYS = 30;

export const SOUTHEAST_STATES = new Set([
  "AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "VA", "WV",
]);

// Industry groups dominated by investment vehicles and single-property/project
// entities rather than operating companies that hire.
const FUND_INDUSTRIES = new Set([
  "Pooled Investment Fund",
  "Investing",
  "Investment Banking",
  "REITS and Finance",
  "Commercial",
  "Residential",
  "Other Real Estate",
]);

// Names that signal funds, SPVs, and series/project vehicles, e.g.
// "AM-0901 Fund I, a series of Mute Ventures, LP" or "ACRETRADER 298 LLC".
const FUND_NAME =
  /\b(fund|funds|spv|feeder|co-?invest\w*|a series of|series \w+ of|capital partners|investor group|land|properties|realty|re,? (llc|lp)|partners,? l\.?p\.?|investors,? (llc|lp)|opportunit(y|ies) (llc|lp|fund)|\d+ (llc|lp|l\.p\.))\b/i;

/** Cheap check on the index name, before fetching the filing. */
export function looksLikeFundName(name: string) {
  return FUND_NAME.test(name);
}

/** Offering size, falling back to amount sold when the offering is "Indefinite". */
export function raiseAmount(f: Pick<FormDFiling, "totalOfferingAmount" | "totalAmountSold">) {
  return f.totalOfferingAmount ?? f.totalAmountSold;
}

export type Rejection = "fund" | "amount" | "first_sale";

/** Returns why a filing is excluded, or null if it's a lead. */
export function rejectFiling(f: FormDFiling, today = new Date()): Rejection | null {
  if (
    f.isPooledFund ||
    (f.industry && FUND_INDUSTRIES.has(f.industry)) ||
    looksLikeFundName(f.companyName)
  ) {
    return "fund";
  }

  const raise = raiseAmount(f);
  if (raise === null || raise < MIN_RAISE || raise > MAX_RAISE) return "amount";

  if (!f.dateOfFirstSale) return "first_sale";
  const ageDays = (today.getTime() - new Date(f.dateOfFirstSale).getTime()) / 86_400_000;
  if (ageDays < 0 || ageDays > FIRST_SALE_WINDOW_DAYS) return "first_sale";

  return null;
}
