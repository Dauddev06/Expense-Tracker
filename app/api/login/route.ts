// ⚠️ TEMPORARY (Steps 2-4). Deleted in Step 5 - NextAuth handles login.
import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/services/user.service";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required" },
      { status: 400 },
    );
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    // Same message for "no such email" and "wrong password" on purpose:
    // we don't want to tell attackers which emails are registered.
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 },
    );
  }

  await createSession(user.id); // creates DB row + sets the httpOnly cookie
  return NextResponse.json({ user });
}
