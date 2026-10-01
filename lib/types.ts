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
  dateFound: string;
  dateApplied: string | null;
  status: Status;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewOpportunity = {
  companyName: string;
  roleTitle: string;
  jobUrl?: string;
  contactName?: string;
  contactEmail?: string;
  source?: string;
  notes?: string;
};

export type Template = {
  id: string;
  title: string;
  category: string;
  body: string;
};
