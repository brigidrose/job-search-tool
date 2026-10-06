import { XMLParser } from "fast-xml-parser";
import { domainStem } from "@/lib/formd/contacts";
import type { CompanyResearch, NewsItem } from "@/lib/types";

// Company research from free public sources. Every source is best-effort:
// a failure is recorded in `errors` and the rest of the result still returns.

const TIMEOUT_MS = 8000;
const MAX_NEWS = 5;

type Funding = NonNullable<CompanyResearch["funding"]>;
type Hiring = NonNullable<CompanyResearch["hiring_signals"]>;

export type FormDFunding = {
  totalOfferingAmount: number | null;
  totalAmountSold: number | null;
  dateFiled: Date;
  filingUrl: string;
};

export type ResearchInput = {
  companyName: string;
  companyDomain?: string | null;
  /** Replaces the automatic news search, for ambiguous company names. */
  newsQuery?: string | null;
  formD?: FormDFunding | null;
};

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** "Bounce Systems, Inc." -> "Bounce Systems" */
export function searchName(companyName: string) {
  return (
    companyName
      .replace(/,?\s+(inc|incorporated|llc|l\.l\.c|corp|corporation|co|ltd|limited|pbc|plc)\.?$/i, "")
      .trim() || companyName
  );
}

function formatMoney(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  return `$${Math.round(n / 1_000)}K`;
}

function monthYear(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// --- News (Google News RSS, no key needed) ---------------------------------

const rss = new XMLParser({ ignoreAttributes: true, isArray: (name) => name === "item" });

async function fetchNews(name: string, customQuery?: string | null): Promise<NewsItem[]> {
  // One-word names ("Ramp", "Bold") match everyday headlines, so anchor them
  // to business coverage.
  const context = /\s/.test(name) ? "" : " (company OR startup OR funding OR CEO)";
  const query = encodeURIComponent(customQuery ?? `"${name}"${context}`);
  const res = await fetch(
    `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const items: { title?: unknown; link?: unknown; pubDate?: unknown; source?: unknown }[] =
    rss.parse(await res.text())?.rss?.channel?.item ?? [];

  return items
    .map((item) => {
      const source = typeof item.source === "string" ? item.source : null;
      let title = String(item.title ?? "");
      // Google appends " - Publisher" to every headline.
      if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -source.length - 3);
      const date = item.pubDate ? new Date(String(item.pubDate)) : null;
      return {
        title,
        url: String(item.link ?? ""),
        source,
        date: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
      };
    })
    // A custom query is trusted as-is; automatic ones are checked for relevance.
    .filter((n) => n.title && n.url && (customQuery || mentionsCompany(name, n.title)))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

const ROUND = /\b(pre-seed|seed|series\s+[a-f])\b/i;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when a headline uses the company name as a proper noun. */
function mentionsCompany(name: string, title: string) {
  // One-word names must match case ("Bold", not "a bold call").
  const flags = /\s/.test(name) ? "i" : "";
  return new RegExp(`(^|[^\\w])${escapeRegExp(name)}($|[^\\w])`, flags).test(title);
}

/**
 * Looks for "<Company> raises $X" in the headlines. Deliberately strict:
 * valuations and other companies' rounds must not be reported as funding.
 */
function fundingFromNews(name: string, news: NewsItem[]): Funding | null {
  const raisePattern = new RegExp(
    `${escapeRegExp(name)}\\b.{0,40}?\\b(?:raises?|raised|secures?|secured|closes?|closed|lands?|nabs?|bags?)\\b[^$]{0,25}\\$\\s?([\\d.]+)\\s*(k|m|mm|million|b|bn|billion)\\b`,
    "i",
  );
  for (const item of news) {
    const title = item.title;
    const raise = title.match(raisePattern);
    if (!raise) continue;
    const round = title.match(ROUND)?.[1] ?? null;

    const unit = raise[2].toLowerCase();
    const multiplier = unit.startsWith("b") ? 1e9 : unit.startsWith("k") ? 1e3 : 1e6;
    const amount = Number(raise[1]) * multiplier;
    const roundLabel = round
      ? round.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : null;
    return {
      summary: [
        roundLabel,
        amount && formatMoney(amount),
        item.date && `reported ${monthYear(item.date)}`,
      ]
        .filter(Boolean)
        .join(", "),
      amount,
      date: item.date,
      round: roundLabel,
      investors: [],
      source: "news",
      url: item.url,
    };
  }
  return null;
}

// --- Hiring (public job-board APIs) ----------------------------------------

const RELEVANT_ROLE = /\b(product manager|program manager|product owner|tpm|product lead|chief of staff)\b/i;

type Board = {
  provider: string;
  api: (slug: string) => string;
  page: (slug: string) => string;
  titles: (data: unknown) => string[];
};

const BOARDS: Board[] = [
  {
    provider: "Greenhouse",
    api: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`,
    page: (s) => `https://boards.greenhouse.io/${s}`,
    titles: (d) => (d as { jobs: { title: string }[] }).jobs.map((j) => j.title),
  },
  {
    provider: "Lever",
    api: (s) => `https://api.lever.co/v0/postings/${s}?mode=json`,
    page: (s) => `https://jobs.lever.co/${s}`,
    titles: (d) => (d as { text: string }[]).map((j) => j.text),
  },
  {
    provider: "Ashby",
    api: (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}`,
    page: (s) => `https://jobs.ashbyhq.com/${s}`,
    titles: (d) => (d as { jobs: { title: string }[] }).jobs.map((j) => j.title),
  },
];

/**
 * Tries the company's likely job-board addresses. Boards are matched by name
 * only, so a hit can belong to a different company with the same name.
 */
async function fetchHiring(name: string, domain?: string | null): Promise<Hiring | null> {
  const slugs = new Set(
    [
      domain?.split(".")[0],
      domainStem(name),
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    ].filter((s): s is string => !!s && s.length >= 3),
  );

  const attempts = BOARDS.flatMap((board) =>
    [...slugs].map(async (slug) => {
      const titles = board.titles(await fetchJson(board.api(slug)));
      if (titles.length === 0) throw new Error("empty board");
      return {
        openPositions: titles.length,
        relevantRoles: titles.filter((t) => RELEVANT_ROLE.test(t)).slice(0, 5),
        provider: board.provider,
        boardUrl: board.page(slug),
      };
    }),
  );
  // Missing boards (404) are the normal case, so individual failures are ignored.
  const found = (await Promise.allSettled(attempts)).flatMap((r) =>
    r.status === "fulfilled" ? [r.value] : [],
  );
  return found.sort((a, b) => b.openPositions - a.openPositions)[0] ?? null;
}

// --- Crunchbase (optional; only runs when CRUNCHBASE_API_KEY is set) --------

async function fetchCrunchbase(name: string, key: string): Promise<Funding | null> {
  const headers = { "X-cb-user-key": key };
  const search = await fetchJson(
    `https://api.crunchbase.com/api/v4/autocompletes?query=${encodeURIComponent(name)}&collection_ids=organizations&limit=1`,
    { headers },
  );
  const permalink = search?.entities?.[0]?.identifier?.permalink;
  if (!permalink) return null;

  const org = await fetchJson(
    `https://api.crunchbase.com/api/v4/entities/organizations/${permalink}?field_ids=last_funding_type,last_funding_at,last_equity_funding_total,investor_identifiers`,
    { headers },
  );
  const p = org?.properties ?? {};
  if (!p.last_funding_type && !p.last_funding_at) return null;

  const round = p.last_funding_type
    ? String(p.last_funding_type).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;
  const amount = p.last_equity_funding_total?.value_usd ?? null;
  return {
    summary: [round, amount && formatMoney(amount), p.last_funding_at && `raised ${monthYear(p.last_funding_at)}`]
      .filter(Boolean)
      .join(", "),
    amount,
    date: p.last_funding_at ?? null,
    round,
    investors: (p.investor_identifiers ?? []).map((i: { value: string }) => i.value).slice(0, 5),
    source: "crunchbase",
    url: `https://www.crunchbase.com/organization/${permalink}`,
  };
}

// --- Form D (already in our database) --------------------------------------

function fundingFromFormD(formD: FormDFunding): Funding | null {
  const amount = formD.totalOfferingAmount ?? formD.totalAmountSold;
  if (amount === null) return null;
  const sold =
    formD.totalAmountSold !== null && formD.totalAmountSold !== amount
      ? ` (${formatMoney(formD.totalAmountSold)} sold so far)`
      : "";
  return {
    summary: `${formatMoney(amount)} offering${sold}, SEC Form D filed ${monthYear(formD.dateFiled)}`,
    amount,
    date: formD.dateFiled.toISOString(),
    round: null,
    investors: [],
    source: "form_d",
    url: formD.filingUrl,
  };
}

// A raise size hints at stage but doesn't name the round, so these labels
// deliberately avoid "Series X".
function stageFromAmount(amount: number) {
  if (amount < 5_000_000) return "Seed-stage startup";
  if (amount < 20_000_000) return "Early-stage startup";
  return "Growth-stage startup";
}

function stageFor(funding: Funding | null): CompanyResearch["stage"] {
  if (!funding) return null;
  const origin = { form_d: "SEC Form D", crunchbase: "Crunchbase", news: "a news headline" }[
    funding.source
  ];
  if (funding.round) return { label: funding.round, basis: `Round named in ${origin}` };
  if (funding.amount) {
    return {
      label: stageFromAmount(funding.amount),
      basis: `Estimated from the ${formatMoney(funding.amount)} raise in ${origin}`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------

export async function researchCompany(input: ResearchInput): Promise<CompanyResearch> {
  const name = searchName(input.companyName);
  const q = encodeURIComponent(name);
  const errors: string[] = [];
  const crunchbaseKey = process.env.CRUNCHBASE_API_KEY?.trim();

  const [news, hiring, crunchbase] = await Promise.allSettled([
    fetchNews(name, input.newsQuery),
    fetchHiring(name, input.companyDomain),
    crunchbaseKey ? fetchCrunchbase(name, crunchbaseKey) : Promise.resolve(null),
  ]);

  const allNews = news.status === "fulfilled" ? news.value : [];
  if (news.status === "rejected") errors.push(`News lookup failed (${news.reason?.message ?? news.reason})`);
  if (hiring.status === "rejected") errors.push("Job board lookup failed");
  if (crunchbase.status === "rejected") {
    errors.push(`Crunchbase lookup failed (${crunchbase.reason?.message ?? crunchbase.reason})`);
  }

  // Prefer the most authoritative funding source available.
  const funding =
    (crunchbase.status === "fulfilled" ? crunchbase.value : null) ??
    (input.formD ? fundingFromFormD(input.formD) : null) ??
    fundingFromNews(name, allNews);

  return {
    companyName: input.companyName,
    funding,
    stage: stageFor(funding),
    hiring_signals: hiring.status === "fulfilled" ? hiring.value : null,
    recent_news: allNews.slice(0, MAX_NEWS),
    links: {
      linkedinJobs: `https://www.linkedin.com/jobs/search/?keywords=${q}`,
      google: `https://www.google.com/search?q=${q}+company+funding+careers`,
      googleNews: `https://news.google.com/search?q=%22${q}%22`,
      crunchbase: `https://www.crunchbase.com/textsearch?q=${q}`,
    },
    errors,
    fetchedAt: new Date().toISOString(),
  };
}
