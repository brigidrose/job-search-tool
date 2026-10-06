import { GEOGRAPHY_PRESETS, type SearchProfile } from "@/lib/search-profile";

// Builds Google queries ("dorks") from the search profile. They target
// applicant-tracking systems and company career pages directly, where postings
// are indexed before job aggregators pick them up. Client-safe and pure.

export type GeneratedDorks = {
  greenHouseDorks: string[];
  workableDorks: string[];
  leverDorks: string[];
  otherAtsDorks: string[];
  companyCareerPageDorks: string[];
  nicheBoardDorks: string[];
  geographyDorks: string[];
  customDorks: string[];
};

export const DORK_CATEGORIES: { key: keyof GeneratedDorks; label: string }[] = [
  { key: "greenHouseDorks", label: "Greenhouse Careers" },
  { key: "leverDorks", label: "Lever Careers" },
  { key: "workableDorks", label: "Workable Careers" },
  { key: "otherAtsDorks", label: "Other Hiring Platforms" },
  { key: "companyCareerPageDorks", label: "Company Career Pages" },
  { key: "nicheBoardDorks", label: "Niche Boards" },
  { key: "geographyDorks", label: "Geography-Specific" },
  { key: "customDorks", label: "Your Custom Searches" },
];

const OTHER_ATS = [
  "jobs.ashbyhq.com",
  "jobs.smartrecruiters.com",
  "bamboohr.com",
  "icims.com",
  "taleo.net",
];

const NICHE_BOARDS = [
  "wellfound.com", // formerly angel.co
  "weworkremotely.com",
  "workatastartup.com",
  "news.ycombinator.com", // Hacker News "Who is hiring?" threads
];

const NO_AGGREGATORS = "-site:indeed.com -site:linkedin.com -site:glassdoor.com";

// Google ignores terms past ~32 words, so cap how many titles go in one query.
const MAX_TITLES = 6;

function quote(term: string) {
  return /\s/.test(term) ? `"${term}"` : term;
}

function anyOf(terms: string[]) {
  const quoted = terms.map((t) => `"${t}"`);
  return quoted.length === 1 ? quoted[0] : `(${quoted.join(" OR ")})`;
}

export function googleSearchUrl(dork: string, pastWeekOnly = false) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(dork)}`;
  return pastWeekOnly ? `${url}&tbs=qdr:w` : url;
}

export function generateDorks(profile: SearchProfile): GeneratedDorks {
  const dorks: GeneratedDorks = {
    greenHouseDorks: [],
    workableDorks: [],
    leverDorks: [],
    otherAtsDorks: [],
    companyCareerPageDorks: [],
    nicheBoardDorks: [],
    geographyDorks: [],
    customDorks: profile.customDorks,
  };
  if (profile.jobTitles.length === 0) return dorks;

  const titles = anyOf(profile.jobTitles.slice(0, MAX_TITLES));
  // One query for everything on the platform, one narrowed to remote roles.
  const forSite = (site: string) =>
    profile.allowRemote
      ? [`site:${site} ${titles}`, `site:${site} ${titles} remote`]
      : [`site:${site} ${titles}`];

  dorks.greenHouseDorks = forSite("greenhouse.io");
  dorks.workableDorks = forSite("workable.com");
  dorks.leverDorks = forSite("lever.co");
  dorks.otherAtsDorks = OTHER_ATS.map((site) => `site:${site} ${titles}`);

  // Google has no wildcard like site:.com/careers, so match the URL path instead.
  dorks.companyCareerPageDorks = [
    `inurl:careers ${titles} ${NO_AGGREGATORS}`,
    `inurl:jobs ${titles} ${NO_AGGREGATORS}`,
  ];
  if (profile.allowRemote) {
    dorks.companyCareerPageDorks.push(`inurl:careers ${titles} remote ${NO_AGGREGATORS}`);
  }

  dorks.nicheBoardDorks = NICHE_BOARDS.map((site) => `site:${site} ${titles}`);

  dorks.geographyDorks = profile.geographies.map((geography) => {
    // Region names like "Southeast (all states)" aren't searchable; use their cities.
    const terms = GEOGRAPHY_PRESETS[geography]?.searchTerms ?? [geography];
    const places = terms.length === 1 ? quote(terms[0]) : `(${terms.map(quote).join(" OR ")})`;
    return `${titles} ${places} ${NO_AGGREGATORS}`;
  });

  return dorks;
}
