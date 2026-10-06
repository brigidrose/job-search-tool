import type { NextRequest } from "next/server";
import { generateDorks } from "@/lib/dorks";
import { findSearchProfile } from "@/lib/search-profile-server";

// GET /api/search-profile/generated-dorks?profileId=xyz (profileId optional)
export async function GET(request: NextRequest) {
  const profile = await findSearchProfile(request.nextUrl.searchParams.get("profileId"));
  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });
  return Response.json(generateDorks(profile));
}
