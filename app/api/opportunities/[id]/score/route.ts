import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opportunityInclude, withFit } from "@/lib/opportunities";
import { getSearchProfile } from "@/lib/search-profile-server";

// Returns { score, reasoning, badge } for one opportunity, scored against the
// search profile. Inputs (role, source, location, linked Form D data, cached
// research) come from the database.
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/opportunities/[id]/score">,
) {
  const { id } = await ctx.params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: opportunityInclude,
  });
  if (!opportunity) {
    return Response.json({ error: "Opportunity not found" }, { status: 404 });
  }
  return Response.json(withFit(opportunity, await getSearchProfile()).fit);
}
