import type { Prisma } from "@/app/generated/prisma/client";
import { demoDb, ownerDb } from "@/lib/db";
import type { CompanyResearch, Status } from "@/lib/types";

// The visitor demo: a separate copy of the tables filled with sample
// opportunities plus the real (public) Form D leads. Visitors can edit it
// freely; it is rebuilt from scratch every hour so nothing they do lasts.

export const DEMO_RESET_MINUTES = 60;
// Limits that keep a shared public sandbox from being filled up or used to
// make this server send unlimited outside requests.
export const DEMO_MAX_OPPORTUNITIES = 60;
export const DEMO_MAX_RESEARCH_PER_HOUR = 30;

const DAY = 86_400_000;

type Sample = {
  companyName: string;
  roleTitle: string;
  location: string;
  status: Status;
  source: string;
  contactName: string;
  foundDaysAgo: number;
  appliedDaysAgo?: number;
  notes: string;
  funding?: { round: string; amount: number; monthsAgo: number };
  headline?: string;
};

// Fictional companies. Contact emails use example.com, which can't receive mail.
const SAMPLES: Sample[] = [
  {
    companyName: "Northlight Health",
    roleTitle: "Senior Product Manager",
    location: "Atlanta, GA",
    status: "interview",
    source: "Referral",
    contactName: "Dana Whitfield",
    foundDaysAgo: 12,
    appliedDaysAgo: 9,
    notes: "Second-round interview scheduled. Team is building remote patient monitoring.",
    funding: { round: "Series B", amount: 28_000_000, monthsAgo: 2 },
    headline: "Northlight Health raises $28M Series B to expand remote monitoring",
  },
  {
    companyName: "Tidewater Robotics",
    roleTitle: "Technical Program Manager",
    location: "Remote",
    status: "outreach_sent",
    source: "Company website",
    contactName: "Marcus Oyelaran",
    foundDaysAgo: 6,
    notes: "Sent a cold note to the VP of Engineering about their warehouse automation launch.",
    funding: { round: "Series A", amount: 14_000_000, monthsAgo: 4 },
    headline: "Tidewater Robotics opens second fulfillment pilot",
  },
  {
    companyName: "Cobalt Ledger",
    roleTitle: "Product Manager, Payments",
    location: "New York, NY",
    status: "applied",
    source: "LinkedIn",
    contactName: "Priya Raman",
    foundDaysAgo: 8,
    appliedDaysAgo: 7,
    notes: "Applied through the careers page. Follow up next week if no reply.",
    funding: { round: "Series C", amount: 60_000_000, monthsAgo: 7 },
  },
  {
    companyName: "Brightloop Learning",
    roleTitle: "Senior TPM",
    location: "Raleigh, NC",
    status: "response_received",
    source: "Google search",
    contactName: "Elena Kovacs",
    foundDaysAgo: 4,
    notes: "Recruiter replied and asked for availability. Early-stage team, seed round last year.",
  },
  {
    companyName: "Fernway Logistics",
    roleTitle: "Program Manager",
    location: "Chicago, IL",
    status: "found",
    source: "LinkedIn",
    contactName: "Tom Bellamy",
    foundDaysAgo: 2,
    notes: "Operations-focused role. Lower priority.",
  },
  {
    companyName: "Quillstack",
    roleTitle: "Product Marketing Manager",
    location: "Remote",
    status: "no_response",
    source: "Newsletter",
    contactName: "Sasha Lindqvist",
    foundDaysAgo: 20,
    appliedDaysAgo: 18,
    notes: "No reply after two follow-ups.",
  },
  {
    companyName: "Harborview Analytics",
    roleTitle: "Product Manager",
    location: "Charlotte, NC",
    status: "rejected",
    source: "Referral",
    contactName: "Jordan Ames",
    foundDaysAgo: 30,
    appliedDaysAgo: 27,
    notes: "Went with an internal candidate. Asked to stay in touch for future roles.",
    funding: { round: "Series A", amount: 9_000_000, monthsAgo: 10 },
  },
];

function money(n: number) {
  return `$${Math.round(n / 1_000_000)}M`;
}

function sampleResearch(s: Sample, now: Date): CompanyResearch {
  const q = encodeURIComponent(s.companyName);
  const raised = s.funding && new Date(now.getTime() - s.funding.monthsAgo * 30 * DAY);
  return {
    companyName: s.companyName,
    funding:
      s.funding && raised
        ? {
            summary: `${s.funding.round}, ${money(s.funding.amount)}, raised ${raised.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
            amount: s.funding.amount,
            date: raised.toISOString(),
            round: s.funding.round,
            investors: [],
            source: "news",
            url: null,
          }
        : null,
    stage: s.funding ? { label: s.funding.round, basis: "Sample data" } : null,
    hiring_signals: null,
    recent_news: s.headline
      ? [
          {
            title: s.headline,
            url: "https://example.com/",
            source: "Sample data",
            date: new Date(now.getTime() - 10 * DAY).toISOString(),
          },
        ]
      : [],
    links: {
      linkedinJobs: `https://www.linkedin.com/jobs/search/?keywords=${q}`,
      google: `https://www.google.com/search?q=${q}+company+funding+careers`,
      googleNews: `https://news.google.com/search?q=%22${q}%22`,
      crunchbase: `https://www.crunchbase.com/textsearch?q=${q}`,
    },
    errors: [],
    fetchedAt: now.toISOString(),
  };
}

function sampleOpportunities(now: Date): Prisma.OpportunityCreateManyInput[] {
  const slug = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
  return SAMPLES.map((s) => ({
    companyName: s.companyName,
    roleTitle: s.roleTitle,
    location: s.location,
    status: s.status,
    source: s.source,
    contactName: s.contactName,
    contactEmail: `${s.contactName.split(" ")[0].toLowerCase()}@${slug(s.companyName)}.example.com`,
    notes: s.notes,
    dateFound: new Date(now.getTime() - s.foundDaysAgo * DAY),
    dateApplied: s.appliedDaysAgo ? new Date(now.getTime() - s.appliedDaysAgo * DAY) : null,
    createdAt: new Date(now.getTime() - s.foundDaysAgo * DAY),
    research: sampleResearch(s, now) as unknown as Prisma.InputJsonValue,
    // Backdated so the samples don't count toward the hourly research limit.
    researchFetchedAt: new Date(now.getTime() - s.foundDaysAgo * DAY),
  }));
}

/**
 * Rebuilds the demo from scratch: sample opportunities, a default search
 * profile (created on first read), and a copy of the public Form D leads and
 * outreach templates. Nothing the owner has done to a lead is copied.
 */
export async function resetDemo() {
  const now = new Date();
  const [leads, scanDays, templates] = await Promise.all([
    ownerDb.formDLead.findMany(),
    ownerDb.formDScanDay.findMany(),
    ownerDb.template.findMany(),
  ]);

  await demoDb.$transaction([
    demoDb.formDLead.deleteMany(),
    demoDb.opportunity.deleteMany(),
    demoDb.template.deleteMany(),
    demoDb.searchProfile.deleteMany(),
    demoDb.formDScanDay.deleteMany(),
    demoDb.template.createMany({ data: templates }),
    demoDb.formDScanDay.createMany({ data: scanDays }),
    demoDb.formDLead.createMany({
      data: leads.map((lead) => ({
        ...lead,
        principals: lead.principals as Prisma.InputJsonValue,
        suggestedEmails: lead.suggestedEmails as Prisma.InputJsonValue,
        // Which leads the owner added or flagged is private.
        opportunityId: null,
        remoteFriendly: false,
      })),
    }),
    demoDb.opportunity.createMany({ data: sampleOpportunities(now) }),
    demoDb.demoState.upsert({
      where: { id: 1 },
      update: { lastResetAt: now },
      create: { id: 1, lastResetAt: now },
    }),
  ]);
}

// Avoid a database round trip on every visitor request.
let checkedAt = 0;
const CHECK_INTERVAL_MS = 60_000;

/** Rebuilds the demo if it has never been built or the last reset is stale. */
export async function ensureDemoFresh() {
  if (Date.now() - checkedAt < CHECK_INTERVAL_MS) return;

  const threshold = new Date(Date.now() - DEMO_RESET_MINUTES * 60_000);
  const state = await demoDb.demoState.findUnique({ where: { id: 1 } });
  if (!state) {
    await resetDemo();
  } else if (state.lastResetAt < threshold) {
    // Claim the reset so simultaneous visitors don't all rebuild at once.
    const claimed = await demoDb.demoState.updateMany({
      where: { id: 1, lastResetAt: { lt: threshold } },
      data: { lastResetAt: new Date() },
    });
    if (claimed.count === 1) await resetDemo();
  }
  checkedAt = Date.now();
}
