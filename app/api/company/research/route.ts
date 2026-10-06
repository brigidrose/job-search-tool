import type { Prisma } from "@/app/generated/prisma/client";
import { DEMO_MAX_RESEARCH_PER_HOUR } from "@/lib/demo";
import { getDb } from "@/lib/session";
import { filingUrl } from "@/lib/formd/edgar";
import { opportunityInclude, optionalString, withFit } from "@/lib/opportunities";
import { getSearchProfile } from "@/lib/search-profile-server";
import { researchCompany } from "@/lib/research";

// Fetches company research. Accepts { companyName, companyDomain? } for an
// ad-hoc lookup, or { opportunityId } to research an opportunity and cache the
// result on it. Returns { funding, hiring_signals, recent_news, stage, ... }.
export async function POST(request: Request) {
  const { db: prisma, isDemo } = await getDb();

  // Research makes this server call outside services, so cap it for visitors.
  if (isDemo) {
    const recent = await prisma.opportunity.count({
      where: { researchFetchedAt: { gt: new Date(Date.now() - 3_600_000) } },
    });
    if (recent >= DEMO_MAX_RESEARCH_PER_HOUR) {
      return Response.json(
        { error: "The demo has reached its research limit for this hour. Try again later." },
        { status: 429 },
      );
    }
  }
  const body = await request.json().catch(() => null);
  const opportunityId = optionalString(body?.opportunityId);

  const opportunity = opportunityId
    ? await prisma.opportunity.findUnique({ where: { id: opportunityId } })
    : null;
  if (opportunityId && !opportunity) {
    return Response.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const companyName = opportunity?.companyName ?? optionalString(body?.companyName);
  if (!companyName) {
    return Response.json({ error: "companyName or opportunityId is required" }, { status: 400 });
  }

  // Reuse Form D data we already hold: the linked lead, or one with the same name.
  const lead =
    (opportunity &&
      (await prisma.formDLead.findUnique({ where: { opportunityId: opportunity.id } }))) ??
    (await prisma.formDLead.findMany()).find(
      (l) => l.companyName.trim().toLowerCase() === companyName.trim().toLowerCase(),
    ) ??
    null;

  const research = await researchCompany({
    companyName,
    companyDomain: optionalString(body?.companyDomain) ?? lead?.guessedDomain,
    newsQuery: opportunity?.newsQuery ?? optionalString(body?.newsQuery),
    formD: lead && {
      totalOfferingAmount: lead.totalOfferingAmount,
      totalAmountSold: lead.totalAmountSold,
      dateFiled: lead.dateFiled,
      filingUrl: filingUrl(lead.cik, lead.accessionNumber),
    },
  });

  if (!opportunity) return Response.json({ research });

  const updated = await prisma.opportunity.update({
    where: { id: opportunity.id },
    data: {
      research: research as unknown as Prisma.InputJsonValue,
      researchFetchedAt: new Date(),
    },
    include: opportunityInclude,
  });
  return Response.json({
    research,
    opportunity: withFit(updated, await getSearchProfile(prisma)),
  });
}
