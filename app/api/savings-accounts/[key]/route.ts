import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  closeSavingsAccount,
  updateSavingsAccount,
} from "@/lib/services/savings-account.service";
import { isExtraSavings, isSavingsAccount } from "@/lib/accounts";
import { parseSavingsAccountUpdate } from "@/lib/money-input";
import {
  fieldErrorResponse,
  invalidResponse,
  notFoundResponse,
  unauthorized,
} from "@/lib/api-responses";

// PATCH /api/savings-accounts/:key -> edit it. Body: { name, startingAmount? }
// :key is an extra account ("sv_...") or "savings" (the built-in one: name only)
export async function PATCH(request: Request, ctx: RouteContext<"/api/savings-accounts/[key]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { key } = await ctx.params;
  if (!isSavingsAccount(key)) return notFoundResponse("Account");

  const body = await request.json().catch(() => null);
  const parsed = parseSavingsAccountUpdate(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const account = await updateSavingsAccount(user.id, key, parsed.data);
    return account ? NextResponse.json({ account }) : notFoundResponse("Account");
  } catch (error) {
    return fieldErrorResponse(error);
  }
}

// DELETE /api/savings-accounts/:key -> close it (only when it's empty)
export async function DELETE(_request: Request, ctx: RouteContext<"/api/savings-accounts/[key]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { key } = await ctx.params;
  if (!isExtraSavings(key)) return notFoundResponse("Account");

  try {
    const closed = await closeSavingsAccount(user.id, key);
    return closed ? new NextResponse(null, { status: 204 }) : notFoundResponse("Account");
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
