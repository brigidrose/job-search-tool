import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Single-owner sign-in. The password lives in the APP_PASSWORD environment
// variable; a signed, expiring cookie marks a browser as signed in.

export const SESSION_COOKIE = "owner_session";
export const SESSION_DAYS = 30;

export function passwordConfigured() {
  return !!process.env.APP_PASSWORD;
}

// Signing key derived from the password, so changing the password signs
// everyone out and no second secret needs configuring.
function signingKey() {
  return createHash("sha256").update(`session:${process.env.APP_PASSWORD}`).digest();
}

function sign(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  // Hash first so the comparison is constant-time regardless of input lengths.
  const [x, y] = [a, b].map((v) => createHash("sha256").update(v).digest());
  return timingSafeEqual(x, y);
}

export function checkPassword(candidate: string) {
  const password = process.env.APP_PASSWORD;
  return !!password && safeEqual(candidate, password);
}

export function createSessionToken() {
  const expires = String(Date.now() + SESSION_DAYS * 86_400_000);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token || !passwordConfigured()) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !safeEqual(signature, sign(expires))) return false;
  return Number(expires) > Date.now();
}
