// NextAuth's own URLs: /api/auth/callback/credentials (login),
// /api/auth/signout (logout), /api/auth/session, /api/auth/csrf...
// The code lives in next-auth; this file only connects these URLs to it.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
