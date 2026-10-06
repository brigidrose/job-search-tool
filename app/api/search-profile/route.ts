import {
  getSearchProfile,
  parseProfileInput,
  saveSearchProfile,
} from "@/lib/search-profile-server";
import { getDb } from "@/lib/session";

export async function GET() {
  const { db: prisma } = await getDb();
  return Response.json(await getSearchProfile(prisma));
}

// Creates or updates the (single) search profile.
export async function POST(request: Request) {
  const { db: prisma } = await getDb();
  const body = await request.json().catch(() => null);
  let input;
  try {
    input = parseProfileInput(body);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Invalid profile" },
      { status: 400 },
    );
  }
  return Response.json(await saveSearchProfile(prisma, input));
}
