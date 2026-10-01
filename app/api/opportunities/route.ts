import { prisma } from "@/lib/db";

export async function GET() {
  const opportunities = await prisma.opportunity.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(opportunities);
}

function optionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
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
      notes: optionalString(body.notes),
    },
  });
  return Response.json(opportunity, { status: 201 });
}
