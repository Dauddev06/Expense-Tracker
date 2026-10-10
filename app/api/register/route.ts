import { NextResponse } from "next/server";
import { createUser, EmailTakenError } from "@/lib/services/user.service";

export async function POST(request: Request) {
  // 1. Read the JSON body the browser sent
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // 2. Validate AGAIN on the server (never trust the browser)
  const fieldErrors: Record<string, string[]> = {};
  if (name.length < 2)
    fieldErrors.name = ["Name must be at least 2 characters"];
  if (!/^\S+@\S+\.\S+$/.test(email))
    fieldErrors.email = ["Enter a valid email"];
  if (password.length < 8)
    fieldErrors.password = ["Password must be at least 8 characters"];

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { message: "Please fix the highlighted fields", fieldErrors },
      { status: 400 },
    );
  }

  // 3. Call the service layer (business logic + database)
  try {
    const user = await createUser({ name, email, password });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return NextResponse.json(
        { message: error.message, fieldErrors: { email: [error.message] } },
        { status: 409 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
