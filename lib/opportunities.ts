import type { Prisma } from "@/app/generated/prisma/client";
import { scoreOpportunity } from "@/lib/scoring";
import type { SearchProfile } from "@/lib/search-profile";
import type { CompanyResearch } from "@/lib/types";

// Every opportunity query uses this include so responses carry the linked
// Form D data that scoring and research need.
export const opportunityInclude = {
  formDLead: {
    select: {
      cik: true,
      accessionNumber: true,
      city: true,
      state: true,
      industry: true,
      totalOfferingAmount: true,
      totalAmountSold: true,
      dateOfFirstSale: true,
      dateFiled: true,
      guessedDomain: true,
      isSoutheast: true,
      remoteFriendly: true,
    },
  },
} satisfies Prisma.OpportunityInclude;

type OpportunityRow = Prisma.OpportunityGetPayload<{ include: typeof opportunityInclude }>;

/** Adds the fit score (against the search profile) before an opportunity goes to the client. */
export function withFit(opportunity: OpportunityRow, profile: SearchProfile) {
  return {
    ...opportunity,
    fit: scoreOpportunity(
      { ...opportunity, research: opportunity.research as CompanyResearch | null },
      profile,
    ),
  };
}

export function optionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
