import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createMoneyAction } from "@/lib/services/ledger.service";
import { listActivity } from "@/lib/services/activity.service";
import { parseMoneyActionInput } from "@/lib/money-input";
import { isAccount } from "@/lib/accounts";
import {
  fieldErrorResponse,
  invalidResponse,
  unauthorized,
} from "@/lib/api-responses";

// GET /api/money?account=pocket -> recent activity (optionally one account)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const account = new URL(request.url).searchParams.get("account");
  const activity = await listActivity(user.id, {
    account: isAccount(account) ? account : undefined,
    limit: 50,
  });
  return NextResponse.json({ activity });
}

// POST /api/money -> Add money, Move money, Borrow from / Repay Savings,
// Give Sadqa. The body's `type` says which one.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = parseMoneyActionInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const entry = await createMoneyAction(user.id, parsed.data);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
