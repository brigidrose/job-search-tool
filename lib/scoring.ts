import {
  geographyMatch,
  industryMatch,
  parseLocation,
  stagesForAmount,
} from "@/lib/formd/match";
import type { SearchProfile } from "@/lib/search-profile";
import type { CompanyResearch, FitBadge, FitScore } from "@/lib/types";

// Scores an opportunity 1-10 against the user's search profile. Pure, so the
// list, the detail page, and the score endpoint all agree.

export type ScoringInput = {
  companyName: string;
  roleTitle: string;
  source: string | null;
  location: string | null;
  notes: string | null;
  research: CompanyResearch | null;
  formDLead: {
    city: string | null;
    state: string | null;
    industry: string | null;
    totalOfferingAmount: number | null;
    totalAmountSold: number | null;
    remoteFriendly: boolean;
  } | null;
};

const BASE_SCORE = 5;
const MAX_SCORE = 10;

/** Lower-cases and spells out the common abbreviations so "Sr. PM" and
 *  "Senior Product Manager" compare equal. */
function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\btpm\b/g, "technical program manager")
    .replace(/\bpm\b/g, "product manager")
    .replace(/\bsr\b\.?/g, "senior")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The first profile job title that appears in the role, if any. */
function matchingTitle(roleTitle: string, jobTitles: string[]) {
  const role = ` ${normalizeTitle(roleTitle)} `;
  return jobTitles.find((title) => {
    const wanted = normalizeTitle(title);
    return wanted !== "" && role.includes(` ${wanted} `);
  });
}

/** A round named in research or notes, mapped onto the profile's stage options. */
function namedStages(input: ScoringInput): string[] {
  // research.stage.label can be a size-based estimate, so only the round counts.
  const text = [input.research?.funding?.round, input.notes].filter(Boolean).join(" ");
  const series = text.match(/\bseries[\s-]([a-h])\b/i)?.[1].toUpperCase();
  if (series) return series <= "C" ? [`Series ${series}`] : ["Late Stage", "Growth"];
  if (/\b(pre-)?seed\b/i.test(text)) return ["Seed"];
  if (/\b(ipo|publicly traded|public company)\b/i.test(text)) return ["Public"];
  return [];
}

export function badgeFor(score: number): FitBadge {
  if (score >= 8) return "hot";
  if (score >= 5) return "warm";
  return "cold";
}

export function scoreOpportunity(input: ScoringInput, profile: SearchProfile): FitScore {
  let score = BASE_SCORE;
  const reasoning: string[] = [];
  const add = (points: number, reason: string) => {
    score += points;
    reasoning.push(`${reason} (+${points})`);
  };

  const title = matchingTitle(input.roleTitle, profile.jobTitles);
  if (title) add(2, `Role matches your target title "${title}"`);

  if (input.source === "form_d" || input.formDLead) {
    add(1, "Funded startup (recent Form D filing)");
  }

  // Location: what the user typed wins; otherwise the linked filing's address.
  const typed = parseLocation(input.location);
  const geography = geographyMatch(
    {
      city: typed.city ?? (typed.state ? null : (input.formDLead?.city ?? null)),
      state: typed.state ?? (typed.city ? null : (input.formDLead?.state ?? null)),
      remoteFriendly:
        !!input.formDLead?.remoteFriendly ||
        /\bremote\b/i.test(`${input.location ?? ""} ${input.roleTitle}`),
    },
    profile,
  );
  if (geography) add(1, geography);

  // Stage: a round named in research or notes; else the Form D size estimate.
  const named = namedStages(input);
  const estimated = input.formDLead
    ? stagesForAmount(input.formDLead.totalOfferingAmount ?? input.formDLead.totalAmountSold)
    : [];
  const namedHit = named.find((s) => profile.companyStages.includes(s));
  const estimatedHit =
    named.length === 0 ? estimated.find((s) => profile.companyStages.includes(s)) : undefined;
  if (namedHit) add(1, `${namedHit} is a stage you're targeting`);
  else if (estimatedHit) add(1, `${estimatedHit} is a stage you're targeting (estimated from raise size)`);

  const industry = industryMatch(
    { companyName: input.companyName, industry: input.formDLead?.industry ?? null },
    profile,
  );
  if (industry) add(1, industry);

  if (reasoning.length === 0) reasoning.push("Nothing here matches your search profile yet");

  score = Math.min(MAX_SCORE, score);
  return { score, reasoning, badge: badgeFor(score) };
}
