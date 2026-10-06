import { DEMO_MAX_OPPORTUNITIES } from "@/lib/demo";
import { getDb } from "@/lib/session";
import { opportunityInclude, optionalString, withFit } from "@/lib/opportunities";
import { getSearchProfile } from "@/lib/search-profile-server";

export async function GET() {
  const { db: prisma } = await getDb();
  const opportunities = await prisma.opportunity.findMany({
    orderBy: { createdAt: "desc" },
    include: opportunityInclude,
  });
  const profile = await getSearchProfile(prisma);
  return Response.json(opportunities.map((o) => withFit(o, profile)));
}

// Longest text accepted per field, so nobody can store unbounded content.
const MAX_FIELD = 300;
const MAX_NOTES = 5000;

export async function POST(request: Request) {
  const { db: prisma, isDemo } = await getDb();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tooLong = Object.entries(body).find(
    ([key, value]) =>
      typeof value === "string" && value.length > (key === "notes" ? MAX_NOTES : MAX_FIELD),
  );
  if (tooLong) {
    return Response.json({ error: `${tooLong[0]} is too long` }, { status: 400 });
  }

  if (isDemo && (await prisma.opportunity.count()) >= DEMO_MAX_OPPORTUNITIES) {
    return Response.json(
      { error: "The demo is full for now. It resets within the hour." },
      { status: 429 },
    );
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
  return Response.json(withFit(opportunity, await getSearchProfile(prisma)), { status: 201 });
}
