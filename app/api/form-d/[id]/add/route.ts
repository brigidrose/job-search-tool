import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { filingUrl } from "@/lib/formd/edgar";
import type { Principal } from "@/lib/formd/edgar";

function money(n: number | null) {
  return n === null ? "n/a" : `$${n.toLocaleString("en-US")}`;
}

// Creates an Opportunity from a Form D lead (once per lead/company).
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/form-d/[id]/add">) {
  const { id } = await ctx.params;
  const lead = await prisma.formDLead.findUnique({ where: { id } });
  if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });
  if (lead.opportunityId) {
    return Response.json({ error: "Already in your opportunities" }, { status: 409 });
  }

  // Don't duplicate a company that's already being tracked by hand.
  const name = lead.companyName.trim().toLowerCase();
  const existing = (
    await prisma.opportunity.findMany({
      select: { id: true, companyName: true, formDLead: { select: { id: true } } },
    })
  ).find((o) => o.companyName.trim().toLowerCase() === name);
  if (existing?.formDLead) {
    return Response.json(
      { error: "That company is already linked to another Form D lead" },
      { status: 409 },
    );
  }

  const principals = lead.principals as Principal[];
  const executive =
    principals.find((p) => p.relationships.includes("Executive Officer")) ?? principals[0];
  const emails = lead.suggestedEmails as string[];

  const notes = [
    `Form D filed ${lead.dateFiled.toISOString().slice(0, 10)}: offering ${money(lead.totalOfferingAmount)}, sold ${money(lead.totalAmountSold)}.`,
    lead.industry && `Industry: ${lead.industry}.`,
    [lead.city, lead.state].some(Boolean) && `Location: ${[lead.city, lead.state].filter(Boolean).join(", ")}.`,
    principals.length > 0 &&
      `Principals: ${principals.map((p) => `${p.name} (${p.relationships.join(", ")})`).join("; ")}.`,
    emails.length > 0 && `Guessed emails (UNVERIFIED): ${emails.join(", ")}.`,
    lead.phone && `Phone on filing: ${lead.phone}.`,
    `Filing: ${filingUrl(lead.cik, lead.accessionNumber)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const opportunity = await prisma.$transaction(async (tx) => {
    const opp = existing
      ? await tx.opportunity.findUniqueOrThrow({ where: { id: existing.id } })
      : await tx.opportunity.create({
          data: {
            companyName: lead.companyName,
            roleTitle: "TBD (Form D lead)",
            contactName: executive?.name || null,
            source: "form_d",
            location: [lead.city, lead.state].filter(Boolean).join(", ") || null,
            notes,
          },
        });
    await tx.formDLead.update({ where: { id }, data: { opportunityId: opp.id } });
    return opp;
  });

  return Response.json(
    { opportunity, alreadyTracked: Boolean(existing) },
    { status: existing ? 200 : 201 },
  );
}
