import { resetDemo } from "@/lib/demo";
import { scanFormD } from "@/lib/formd/scan";
import { isOwner } from "@/lib/session";

// A scan fetches hundreds of filings from the SEC, so allow it several minutes.
export const maxDuration = 300;

let running = false;

async function runScan(days: number, afterScan?: () => Promise<void>) {
  if (running) {
    return Response.json({ error: "A scan is already running" }, { status: 409 });
  }
  running = true;
  try {
    const result = await scanFormD({ days });
    await afterScan?.();
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 },
    );
  } finally {
    running = false;
  }
}

// Manual trigger from the UI. Owner only: scans send requests to the SEC under
// the owner's name, so visitors to the demo can't start one.
export async function POST(request: Request) {
  if (!(await isOwner())) {
    return Response.json(
      { error: "Scans are turned off in the demo. New filings are added automatically each day." },
      { status: 403 },
    );
  }
  const body = await request.json().catch(() => ({}));
  const days = Number(body?.days ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    return Response.json({ error: "days must be 1–30" }, { status: 400 });
  }
  return runScan(days);
}

// Daily scheduled trigger (see vercel.json). Vercel Cron sends
// "Authorization: Bearer $CRON_SECRET". After scanning, the demo is rebuilt so
// visitors see the new leads.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runScan(3, resetDemo);
}
