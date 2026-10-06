import type { NextRequest } from "next/server";
import { getDb } from "@/lib/session";
import { opportunityInclude, optionalString, withFit } from "@/lib/opportunities";
import { getSearchProfile } from "@/lib/search-profile-server";
import { isStatus } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/opportunities/[id]">,
) {
  const { db: prisma } = await getDb();
  const { id } = await ctx.params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: opportunityInclude,
  });
  if (!opportunity) {
    return Response.json({ error: "Opportunity not found" }, { status: 404 });
  }
  return Response.json(withFit(opportunity, await getSearchProfile(prisma)));
}

// Updates any of: status, location, newsQuery.
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/opportunities/[id]">,
) {
  const { db: prisma } = await getDb();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  const hasStatus = body?.status !== undefined;
  const hasLocation = body?.location !== undefined;
  const hasNewsQuery = body?.newsQuery !== undefined;
  if (!body || (!hasStatus && !hasLocation && !hasNewsQuery)) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (hasStatus && !isStatus(body.status)) {
    return Response.json({ error: "A valid status is required" }, { status: 400 });
  }
  for (const field of ["location", "newsQuery"] as const) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== "string") {
      return Response.json({ error: `${field} must be text` }, { status: 400 });
    }
    if (typeof body[field] === "string" && body[field].length > 300) {
      return Response.json({ error: `${field} is too long` }, { status: 400 });
    }
  }

  const existing = await prisma.opportunity.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      status: hasStatus ? body.status : undefined,
      // Stamp the applied date the first time something moves to "applied".
      dateApplied:
        body.status === "applied" && !existing.dateApplied ? new Date() : undefined,
      location: hasLocation ? optionalString(body.location) : undefined,
      newsQuery: hasNewsQuery ? optionalString(body.newsQuery) : undefined,
    },
    include: opportunityInclude,
  });
  return Response.json(withFit(opportunity, await getSearchProfile(prisma)));
}
