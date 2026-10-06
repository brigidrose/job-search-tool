import { cookies } from "next/headers";
import { passwordConfigured, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { demoDb, ownerDb, type Db } from "@/lib/db";
import { ensureDemoFresh } from "@/lib/demo";

/**
 * True when the request comes from the signed-in owner.
 *
 * With no APP_PASSWORD set, local development treats everyone as the owner so
 * the app works without setup. In production that would expose real data, so
 * there everyone is a visitor until a password is configured.
 */
export async function isOwner() {
  if (!passwordConfigured()) return process.env.NODE_ENV !== "production";
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * The database for whoever is making this request: the owner's real data, or
 * the sample data for visitors. Every request handler gets its data from here,
 * so a visitor can never read or change the owner's records.
 */
export async function getDb(): Promise<{ db: Db; isDemo: boolean }> {
  if (await isOwner()) return { db: ownerDb, isDemo: false };
  await ensureDemoFresh();
  return { db: demoDb, isDemo: true };
}
