// ⚠️ TEMPORARY (Steps 2-4). NextAuth replaces this whole file in Step 5.
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getRepo } from "@/lib/db/data-source";
import { getUserById, type PublicUser } from "@/lib/services/user.service";

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

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const repo = await getRepo("Session");
  const session = await repo.findOne({ where: { token } });
  if (!session || session.expiresAt < new Date()) return null;

  return getUserById(session.userId);
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const repo = await getRepo("Session");
    await repo.delete({ token });
  }
  cookieStore.delete(COOKIE_NAME);
}
