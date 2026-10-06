import { cookies } from "next/headers";
import {
  checkPassword,
  createSessionToken,
  passwordConfigured,
  SESSION_COOKIE,
  SESSION_DAYS,
} from "@/lib/auth";
import { ownerDb } from "@/lib/db";

// Password guessing is slowed by locking sign-in after repeated failures.
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60_000;

export async function POST(request: Request) {
  if (!passwordConfigured()) {
    return Response.json({ error: "Sign-in isn't set up on this site" }, { status: 400 });
  }

  const failures = await ownerDb.loginAttempt.count({
    where: { createdAt: { gt: new Date(Date.now() - WINDOW_MS) } },
  });
  if (failures >= MAX_FAILURES) {
    return Response.json(
      { error: "Too many failed attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.password !== "string" || !checkPassword(body.password)) {
    await ownerDb.loginAttempt.create({ data: {} });
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  await ownerDb.loginAttempt.deleteMany();
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return Response.json({ isOwner: true });
}
