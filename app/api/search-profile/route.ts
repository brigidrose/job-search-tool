import {
  getSearchProfile,
  parseProfileInput,
  saveSearchProfile,
} from "@/lib/search-profile-server";

export async function GET() {
  return Response.json(await getSearchProfile());
}

// Creates or updates the (single) search profile.
export async function POST(request: Request) {
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
  return Response.json(await saveSearchProfile(input));
}
