import { passwordConfigured } from "@/lib/auth";
import { DEMO_RESET_MINUTES } from "@/lib/demo";
import { isOwner } from "@/lib/session";

// Tells the UI whether this browser is the signed-in owner or a demo visitor.
export async function GET() {
  return Response.json({
    isOwner: await isOwner(),
    signInAvailable: passwordConfigured(),
    demoResetMinutes: DEMO_RESET_MINUTES,
  });
}
