import type { NextRequest } from "next/server";
import { generateDorks } from "@/lib/dorks";
import { findSearchProfile } from "@/lib/search-profile-server";
import { getDb } from "@/lib/session";

// GET /api/search-profile/generated-dorks?profileId=xyz (profileId optional)
export async function GET(request: NextRequest) {
  const { db: prisma } = await getDb();
  const profile = await findSearchProfile(prisma, request.nextUrl.searchParams.get("profileId"));
  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });
  return Response.json(generateDorks(profile));
}
