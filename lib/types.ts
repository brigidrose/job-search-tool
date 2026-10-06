// Client-safe shapes and constants shared by the API routes and the UI.
// Kept separate from the generated Prisma client so client components
// never pull in database code.

export const STATUSES = [
  "found",
  "applied",
  "outreach_sent",
  "response_received",
  "interview",
  "offer",
  "rejected",
  "no_response",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  found: "Found",
  applied: "Applied",
  outreach_sent: "Outreach sent",
  response_received: "Response received",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  no_response: "No response",
};

// Statuses that mean outreach has gone out (no_response = sent, never answered).
export const OUTREACH_SENT_STATUSES: Status[] = [
  "outreach_sent",
  "response_received",
  "interview",
  "offer",
  "no_response",
];

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

// Dates arrive over JSON as ISO strings.
export type Opportunity = {
  id: string;
  companyName: string;
  roleTitle: string;
  jobUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  source: string | null;
  location: string | null;
  dateFound: string;
  dateApplied: string | null;
  status: Status;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  newsQuery: string | null;
  research: CompanyResearch | null;
  researchFetchedAt: string | null;
  formDLead: LinkedFormDLead | null;
  fit: FitScore;
};

// The Form D fields that matter once a lead has become an opportunity.
export type LinkedFormDLead = Pick<
  FormDLead,
  | "cik"
  | "accessionNumber"
  | "city"
  | "state"
  | "industry"
  | "totalOfferingAmount"
  | "totalAmountSold"
  | "dateOfFirstSale"
  | "dateFiled"
  | "guessedDomain"
  | "isSoutheast"
  | "remoteFriendly"
>;

export type FitBadge = "hot" | "warm" | "cold";

export type FitScore = { score: number; reasoning: string[]; badge: FitBadge };

export const FIT_LABELS: Record<FitBadge, string> = {
  hot: "Hot Fit",
  warm: "Warm",
  cold: "Cold",
};

export type NewsItem = {
  title: string;
  url: string;
  source: string | null;
  date: string | null;
};

export type CompanyResearch = {
  companyName: string;
  funding: {
    summary: string;
    amount: number | null;
    date: string | null;
    round: string | null;
    investors: string[];
    source: "form_d" | "crunchbase" | "news";
    url: string | null;
  } | null;
  stage: { label: string; basis: string } | null;
  hiring_signals: {
    openPositions: number;
    relevantRoles: string[];
    provider: string;
    boardUrl: string;
  } | null;
  recent_news: NewsItem[];
  // Manual lookups, always present so a failed fetch never blocks the workflow.
  links: { linkedinJobs: string; google: string; googleNews: string; crunchbase: string };
  // Human-readable notes on sources that failed or were skipped.
  errors: string[];
  fetchedAt: string;
};

export type NewOpportunity = {
  companyName: string;
  roleTitle: string;
  jobUrl?: string;
  contactName?: string;
  contactEmail?: string;
  source?: string;
  location?: string;
  notes?: string;
};

export type Template = {
  id: string;
  title: string;
  category: string;
  body: string;
};

export type Principal = { name: string; relationships: string[] };

export type FormDLead = {
  id: string;
  cik: string;
  accessionNumber: string;
  companyName: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  industry: string | null;
  entityType: string | null;
  totalOfferingAmount: number | null;
  totalAmountSold: number | null;
  dateOfFirstSale: string | null;
  dateFiled: string;
  principals: Principal[];
  guessedDomain: string | null;
  suggestedEmails: string[];
  isSoutheast: boolean;
  remoteFriendly: boolean;
  opportunityId: string | null;
  createdAt: string;
  // How the lead compares to the search profile (see lib/formd/match.ts).
  stage: string | null;
  location: string | null;
  matchScore: number;
  reasonsForMatch: string[];
  matchesProfile: boolean;
};

export type FormDScanResult = {
  daysScanned: string[];
  filingsSeen: number;
  leadsAdded: number;
  skipped: Record<string, number>;
  errors: string[];
};
