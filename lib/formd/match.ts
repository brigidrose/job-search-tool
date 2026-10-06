import { GEOGRAPHY_PRESETS, type SearchProfile } from "@/lib/search-profile";

// Scores a Form D lead against the user's search profile. Form D has no round
// name, no remote flag, and only a coarse industry group, so stage and industry
// are estimates and are labeled that way.

export type MatchableLead = {
  companyName: string;
  city: string | null;
  state: string | null;
  industry: string | null;
  totalOfferingAmount: number | null;
  totalAmountSold: number | null;
  remoteFriendly: boolean;
};

export type LeadMatch = {
  stage: string | null;
  location: string | null;
  matchScore: number;
  reasonsForMatch: string[];
  matchesProfile: boolean;
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico",
};

// Form D uses two-letter codes for US states and letter+digit codes abroad.
function isUsState(state: string | null) {
  return !!state && state in STATE_NAMES;
}

// EDGAR's codes for Canadian provinces (A0-A9, B0) and federal Canada (Z4).
function isCanada(state: string | null) {
  return !!state && /^(A\d|B0|Z4)$/.test(state);
}

/**
 * Splits free text like "Charlotte, NC", "Georgia", or "TX" into the city and
 * state code the geography matcher works with.
 */
export function parseLocation(text: string | null): { city: string | null; state: string | null } {
  const location = text?.trim();
  if (!location) return { city: null, state: null };

  const cityState = location.match(/^(.*?),\s*([A-Z]{2})\b/);
  if (cityState && cityState[2] in STATE_NAMES) {
    return { city: cityState[1].trim() || null, state: cityState[2] };
  }
  if (location in STATE_NAMES) return { city: null, state: location };

  const byName = Object.entries(STATE_NAMES).find(
    ([, name]) => name.toLowerCase() === location.toLowerCase(),
  );
  if (byName) return { city: null, state: byName[0] };
  return { city: location, state: null };
}

/** Stages a raise of this size could plausibly be. First entry is the label. */
export function stagesForAmount(amount: number | null): string[] {
  if (amount === null) return [];
  if (amount < 5_000_000) return ["Seed"];
  if (amount < 20_000_000) return ["Series A"];
  return ["Series B", "Series C", "Growth"];
}

function wholeWords(haystack: string, needle: string) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(haystack);
}

export function geographyMatch(
  lead: Pick<MatchableLead, "city" | "state" | "remoteFriendly">,
  profile: SearchProfile,
): string | null {
  if (profile.allowRemote && lead.remoteFriendly) return "Remote-friendly";

  const city = lead.city?.toLowerCase() ?? "";
  const stateName = lead.state ? STATE_NAMES[lead.state]?.toLowerCase() : undefined;

  for (const geography of profile.geographies) {
    const preset = GEOGRAPHY_PRESETS[geography];
    if (preset?.international) {
      // The filing only tells us the company is outside the US, not where.
      if (lead.state && !isUsState(lead.state) && !isCanada(lead.state)) {
        return `Outside the US (${geography} unconfirmed)`;
      }
    } else if (preset) {
      const inState = !!lead.state && !!preset.states?.includes(lead.state);
      const inCity = !preset.cities || preset.cities.includes(city);
      if (inState && inCity) return `Location match: ${geography}`;
    } else {
      // Custom text: a city, a state name, or a state code.
      const text = geography.toLowerCase();
      if (
        (text === "canada" && isCanada(lead.state)) ||
        // Either contains the other as whole words ("Boulder" / "Boulder area").
        (city && (wholeWords(city, text) || wholeWords(text, city))) ||
        (stateName && text.includes(stateName)) ||
        lead.state?.toLowerCase() === text
      ) {
        return `Location match: ${geography}`;
      }
    }
  }
  return null;
}

const TECH_GROUPS = ["Other Technology", "Computers", "Telecommunications"];

const INDUSTRY_SIGNALS: Record<string, { groups?: string[]; name?: RegExp }> = {
  "AI/ML": { name: /\b(ai|intelligence|robot\w*|machine learning|neural)\b|\.ai\b|agentic/i },
  EdTech: { name: /\b(learn\w*|educat\w*|school\w*|academy|tutor\w*)\b/i },
  FinTech: {
    groups: ["Other Banking and Financial Services", "Insurance"],
    name: /\b(pay\w*|fintech|financ\w*|lend\w*|credit|wallet)\b/i,
  },
  Healthcare: {
    groups: [
      "Biotechnology", "Health Insurance", "Hospitals and Physicians", "Pharmaceuticals",
      "Other Health Care",
    ],
    name: /\b(health\w*|medic\w*|bio\w*|therapeutic\w*|pharma\w*|clinic\w*)\b/i,
  },
  SaaS: { groups: TECH_GROUPS },
  B2B: { groups: [...TECH_GROUPS, "Business Services"] },
  B2C: { groups: ["Retailing", "Restaurants"] },
  Climate: {
    groups: ["Energy Conservation", "Environmental Services", "Other Energy", "Electric Utilities"],
    name: /\b(solar|climate|carbon|clean\w*|fusion|battery|renewable\w*)\b/i,
  },
  "Developer Tools": { groups: TECH_GROUPS },
  Security: { name: /\b(secur\w*|cyber\w*|defense)\b/i },
};

export function industryMatch(
  lead: Pick<MatchableLead, "companyName" | "industry">,
  profile: SearchProfile,
): string | null {
  for (const industry of profile.industries) {
    const signal = INDUSTRY_SIGNALS[industry];
    if (signal) {
      if (signal.name?.test(lead.companyName)) return `Likely ${industry} (from company name)`;
      if (lead.industry && signal.groups?.includes(lead.industry)) {
        return `Possibly ${industry} (filed as "${lead.industry}")`;
      }
    } else {
      // Custom industry: look for the text in the name or the filing's industry group.
      const text = industry.toLowerCase();
      if (`${lead.companyName} ${lead.industry ?? ""}`.toLowerCase().includes(text)) {
        return `Mentions "${industry}"`;
      }
    }
  }
  return null;
}

export function matchLead(lead: MatchableLead, profile: SearchProfile): LeadMatch {
  const amount = lead.totalOfferingAmount ?? lead.totalAmountSold;
  const stages = stagesForAmount(amount);
  const stageLabel = stages.length ? `${stages[0]}${stages.length > 1 ? "+" : ""} (est.)` : null;

  const reasonsForMatch: string[] = [];
  let score = 4;

  // Each dimension: +2 for a match, +1 when the profile doesn't restrict it.
  const wantedStage = stages.find((s) => profile.companyStages.includes(s));
  const stageOk = profile.companyStages.length === 0 || !!wantedStage;
  if (wantedStage) {
    score += 2;
    reasonsForMatch.push(`${wantedStage} match (estimated from raise size)`);
  } else if (stageOk) score += 1;

  const geography = geographyMatch(lead, profile);
  const geographyOk = profile.geographies.length === 0 || !!geography;
  if (geography) {
    score += 2;
    reasonsForMatch.push(geography);
  } else if (geographyOk) score += 1;

  // Industry is best-effort, so it raises the score but never excludes a lead.
  const industry = industryMatch(lead, profile);
  if (industry) {
    score += 2;
    reasonsForMatch.push(industry);
  } else if (profile.industries.length === 0) score += 1;

  const state = isUsState(lead.state)
    ? lead.state
    : isCanada(lead.state)
      ? "Canada"
      : lead.state
        ? "Non-US"
        : null;
  return {
    stage: stageLabel,
    location: [lead.city, state].filter(Boolean).join(", ") || null,
    matchScore: score,
    reasonsForMatch,
    matchesProfile: stageOk && geographyOk,
  };
}
