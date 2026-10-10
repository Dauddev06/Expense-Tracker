import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  closeSavingsAccount,
  renameSavingsAccount,
} from "@/lib/services/savings-account.service";
import { isExtraSavings } from "@/lib/accounts";
import { parseSavingsAccountInput } from "@/lib/money-input";
import {
  fieldErrorResponse,
  invalidResponse,
  notFoundResponse,
  unauthorized,
} from "@/lib/api-responses";

// PATCH /api/savings-accounts/:key -> rename it. Body: { name }
export async function PATCH(request: Request, ctx: RouteContext<"/api/savings-accounts/[key]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { key } = await ctx.params;
  if (!isExtraSavings(key)) return notFoundResponse("Account");

  const body = await request.json().catch(() => null);
  const parsed = parseSavingsAccountInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  const account = await renameSavingsAccount(user.id, key, parsed.data.name);
  return account ? NextResponse.json({ account }) : notFoundResponse("Account");
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
