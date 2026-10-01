import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Toggle the user-set remote-friendly flag (Form D doesn't say).
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/form-d/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (typeof body?.remoteFriendly !== "boolean") {
    return Response.json({ error: "remoteFriendly must be true or false" }, { status: 400 });
  }
  const lead = await prisma.formDLead
    .update({ where: { id }, data: { remoteFriendly: body.remoteFriendly } })
    .catch(() => null);
  if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });
  return Response.json(lead);
}
