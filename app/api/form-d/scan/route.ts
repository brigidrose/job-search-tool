import { scanFormD } from "@/lib/formd/scan";

let running = false;

async function runScan(days: number) {
  if (running) {
    return Response.json({ error: "A scan is already running" }, { status: 409 });
  }
  running = true;
  try {
    return Response.json(await scanFormD({ days }));
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 },
    );
  } finally {
    running = false;
  }
}

// Manual trigger from the UI.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const days = Number(body?.days ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    return Response.json({ error: "days must be 1–30" }, { status: 400 });
  }
  return runScan(days);
}

// Scheduled trigger (e.g. Vercel Cron), which sends
// "Authorization: Bearer $CRON_SECRET".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runScan(2);
}
