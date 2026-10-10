import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deleteLoan, getLoan, updateLoan } from "@/lib/services/loan.service";
import { parseLoanInput } from "@/lib/loan-input";
import { isUuid } from "@/lib/spending-input";
import {
  fieldErrorResponse,
  invalidResponse,
  notFoundResponse,
  unauthorized,
} from "@/lib/api-responses";

const notFound = () => notFoundResponse("Loan");

// GET /api/loans/:id -> the loan with its payments
export async function GET(_request: Request, ctx: RouteContext<"/api/loans/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const loan = await getLoan(user.id, id);
  return loan ? NextResponse.json({ loan }) : notFound();
}

// PATCH /api/loans/:id -> edit name/note/date (amount only while no payments)
export async function PATCH(request: Request, ctx: RouteContext<"/api/loans/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const body = await request.json().catch(() => null);
  const parsed = parseLoanInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const loan = await updateLoan(user.id, id, parsed.data);
    return loan ? NextResponse.json({ loan }) : notFound();
  } catch (error) {
    return fieldErrorResponse(error);
  }
}

// DELETE /api/loans/:id -> removes the loan, its payments and their money movements
export async function DELETE(_request: Request, ctx: RouteContext<"/api/loans/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  try {
    const deleted = await deleteLoan(user.id, id);
    return deleted ? new NextResponse(null, { status: 204 }) : notFound();
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
