import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  getOpeningBalances,
  setOpeningBalances,
} from "@/lib/services/ledger.service";
import { parseOpeningInput } from "@/lib/money-input";
import {
  fieldErrorResponse,
  invalidResponse,
  unauthorized,
} from "@/lib/api-responses";

// GET /api/accounts/opening -> the starting balance of each account
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const opening = await getOpeningBalances(user.id);
  return NextResponse.json({ opening });
}

// PUT /api/accounts/opening -> replace the starting balances
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = parseOpeningInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const opening = await setOpeningBalances(user.id, parsed.data);
    return NextResponse.json({ opening });
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
