import { prisma } from "@/lib/db";
import { opportunityInclude, optionalString, withFit } from "@/lib/opportunities";
import { getSearchProfile } from "@/lib/search-profile-server";

export async function GET() {
  const opportunities = await prisma.opportunity.findMany({
    orderBy: { createdAt: "desc" },
    include: opportunityInclude,
  });
  const profile = await getSearchProfile();
  return Response.json(opportunities.map((o) => withFit(o, profile)));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const companyName = optionalString(body.companyName);
  const roleTitle = optionalString(body.roleTitle);
  if (!companyName || !roleTitle) {
    return Response.json(
      { error: "Company and role are required" },
      { status: 400 },
    );
  }

  const contactEmail = optionalString(body.contactEmail);
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return Response.json({ error: "Contact email looks invalid" }, { status: 400 });
  }

  const jobUrl = optionalString(body.jobUrl);
  if (jobUrl && !/^https?:\/\//i.test(jobUrl)) {
    return Response.json(
      { error: "Job URL must start with http:// or https://" },
      { status: 400 },
    );
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      companyName,
      roleTitle,
      jobUrl,
      contactName: optionalString(body.contactName),
      contactEmail,
      source: optionalString(body.source),
      location: optionalString(body.location),
      notes: optionalString(body.notes),
    },
    include: opportunityInclude,
  });
  return Response.json(withFit(opportunity, await getSearchProfile()), { status: 201 });
}
