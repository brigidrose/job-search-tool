// Client-safe search profile types, option lists, and defaults.

export type SearchProfile = {
  id: string;
  name: string;
  jobTitles: string[];
  industries: string[];
  geographies: string[];
  allowRemote: boolean;
  companyStages: string[];
  minSalary: number | null;
  maxSalary: number | null;
  customDorks: string[];
  updatedAt: string;
};

export type SearchProfileInput = Omit<SearchProfile, "id" | "updatedAt">;

export const JOB_TITLE_OPTIONS = [
  "Product Manager",
  "PM",
  "Senior PM",
  "Lead PM",
  "TPM",
  "Technical Program Manager",
  "Program Manager",
];

export const INDUSTRY_OPTIONS = [
  "AI/ML",
  "EdTech",
  "FinTech",
  "Healthcare",
  "SaaS",
  "B2B",
  "B2C",
  "Climate",
  "Developer Tools",
  "Security",
];

export const STAGE_OPTIONS = [
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Growth",
  "Late Stage",
  "Public",
];

// Remote is controlled by `allowRemote`, not by an entry in `geographies`.
export const REMOTE = "Remote";

type GeographyPreset = {
  // US state codes the region covers (matched against a company's address).
  states?: string[];
  // Cities that narrow the match within those states (lower-case).
  cities?: string[];
  // True for regions outside the US.
  international?: boolean;
  // What to put in a Google query; region labels aren't searchable phrases.
  searchTerms: string[];
};

export const GEOGRAPHY_PRESETS: Record<string, GeographyPreset> = {
  "San Francisco Bay Area": {
    states: ["CA"],
    cities: [
      "san francisco", "oakland", "san jose", "palo alto", "mountain view", "sunnyvale",
      "redwood city", "menlo park", "berkeley", "san mateo", "santa clara", "south san francisco",
      "san bruno", "fremont", "emeryville", "burlingame", "cupertino", "san carlos", "foster city",
    ],
    searchTerms: ["San Francisco", "Bay Area"],
  },
  "New York": { states: ["NY"], searchTerms: ["New York"] },
  Seattle: {
    states: ["WA"],
    cities: ["seattle", "bellevue", "redmond", "kirkland"],
    searchTerms: ["Seattle"],
  },
  Austin: { states: ["TX"], cities: ["austin"], searchTerms: ["Austin"] },
  Denver: { states: ["CO"], cities: ["denver", "boulder"], searchTerms: ["Denver"] },
  "Southeast (all states)": {
    states: ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "VA", "WV"],
    searchTerms: ["Atlanta", "Charlotte", "Raleigh", "Nashville", "Miami", "Tampa"],
  },
  California: { states: ["CA"], searchTerms: ["California"] },
  "East Coast": {
    states: [
      "ME", "NH", "MA", "RI", "CT", "NY", "NJ", "PA", "DE", "MD", "DC", "VA", "NC", "SC", "GA", "FL",
    ],
    searchTerms: ["New York", "Boston", "Washington DC", "Philadelphia", "Atlanta"],
  },
  Midwest: {
    states: ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
    searchTerms: ["Chicago", "Minneapolis", "Detroit", "Columbus", "Indianapolis"],
  },
  "International: UK": { international: true, searchTerms: ["United Kingdom", "London"] },
  "International: EU": {
    international: true,
    searchTerms: ["Europe", "Berlin", "Amsterdam", "Paris", "Dublin"],
  },
  "International: APAC": {
    international: true,
    searchTerms: ["Singapore", "Sydney", "Tokyo", "Bangalore"],
  },
};

export const GEOGRAPHY_OPTIONS = Object.keys(GEOGRAPHY_PRESETS);

export const DEFAULT_PROFILE: SearchProfileInput = {
  name: "My Search Profile",
  jobTitles: ["Product Manager", "Technical Program Manager"],
  industries: [],
  geographies: ["Southeast (all states)"],
  allowRemote: true,
  companyStages: ["Series A", "Series B", "Series C", "Growth"],
  minSalary: null,
  maxSalary: null,
  customDorks: [],
};

/** "Series A/B, Remote, Southeast (all states)" for headings. */
export function summarizeProfile(profile: SearchProfile) {
  const places = [...(profile.allowRemote ? [REMOTE] : []), ...profile.geographies];
  const parts = [
    profile.companyStages.length ? profile.companyStages.join(", ") : "any stage",
    profile.geographies.length ? places.join(", ") : "any location",
  ];
  if (profile.industries.length) parts.push(profile.industries.join(", "));
  return parts.join(" · ");
}
