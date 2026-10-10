// ⚠️ TEMPORARY (Steps 2-4). NextAuth replaces this whole file in Step 5.
import { randomBytes } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { getRepo } from "@/lib/db/data-source";
import type { PublicUser } from "@/lib/services/user.service";

const COOKIE_NAME = "session_token";
const SESSION_DAYS = 7;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex"); // long random, unguessable
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const repo = await getRepo("Session");
  await repo.save(repo.create({ token, userId, expiresAt }));

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true, // JavaScript in the browser can NOT read it
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "lax", // not sent on cross-site POSTs (CSRF protection)
    path: "/",
    expires: expiresAt,
  });
}

// The layout AND the page both ask "who is logged in?". cache() makes that
// ONE database query per request instead of one per call. (Each query costs a
// round trip to the database, which is slow on a hosted server.)
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  // The session and its user in ONE query (a JOIN), not two
  const repo = await getRepo("Session");
  const session = await repo.findOne({ where: { token }, relations: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user) return null;

  const { id, name, email } = session.user;
  return { id, name, email };
});

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const repo = await getRepo("Session");
    await repo.delete({ token });
  }
  cookieStore.delete(COOKIE_NAME);
}

// Only "is there a login cookie?" - no database query, so it's instant.
// Good enough to choose between the landing page and the app: if the
// session turns out to be expired, the app's layout sends you to /login.
export async function hasSessionCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(COOKIE_NAME);
}
