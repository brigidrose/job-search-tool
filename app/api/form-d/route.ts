import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { matchLead } from "@/lib/formd/match";
import { findSearchProfile } from "@/lib/search-profile-server";

// GET /api/form-d             every lead, scored against the search profile
// GET /api/form-d?profileId=x only leads matching that profile ("default" works)
export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  const profile = await findSearchProfile(profileId);
  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  const [rows, lastScan] = await Promise.all([
    prisma.formDLead.findMany({ orderBy: { dateFiled: "desc" } }),
    prisma.formDScanDay.findFirst({ orderBy: { scannedAt: "desc" } }),
  ]);

  const scored = rows.map((lead) => ({ ...lead, ...matchLead(lead, profile) }));
  return Response.json({
    leads: profileId ? scored.filter((l) => l.matchesProfile) : scored,
    total: rows.length,
    lastScannedAt: lastScan?.scannedAt ?? null,
  });
}
