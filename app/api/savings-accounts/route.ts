import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createSavingsAccount } from "@/lib/services/savings-account.service";
import { parseSavingsAccountInput } from "@/lib/money-input";
import { fieldErrorResponse, invalidResponse, unauthorized } from "@/lib/api-responses";

// POST /api/savings-accounts -> open another savings account
// Body: { name: "Emergency fund", startingAmount: 20000 }
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = parseSavingsAccountInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const account = await createSavingsAccount(user.id, parsed.data);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
