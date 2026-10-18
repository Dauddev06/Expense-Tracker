// "Who is logged in?" for the whole app. NextAuth (auth.ts) now makes,
// reads and deletes the login cookie; this file only turns its session into
// our PublicUser, so the ~50 places that call getCurrentUser() stay the same.
import { cache } from "react";
import { auth } from "@/auth";
import type { PublicUser } from "@/lib/services/user.service";

// auth() opens the sealed cookie with AUTH_SECRET: no database query.
// cache() still helps: the layout and the page share one answer per request.
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, name: user.name ?? "", email: user.email };
});

// Used by the landing page to send logged-in visitors straight to /home.
export async function isLoggedIn(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}
