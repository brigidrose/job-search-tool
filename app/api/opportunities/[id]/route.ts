import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isStatus } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/opportunities/[id]">,
) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  if (!body || !isStatus(body.status)) {
    return Response.json({ error: "A valid status is required" }, { status: 400 });
  }

  const existing = await prisma.opportunity.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      status: body.status,
      // Stamp the applied date the first time something moves to "applied".
      dateApplied:
        body.status === "applied" && !existing.dateApplied
          ? new Date()
          : undefined,
    },
  });
  return Response.json(opportunity);
}
