import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deleteIncome, getIncome, updateIncome } from "@/lib/services/income.service";
import { parseIncomeInput } from "@/lib/income-input";
import { isUuid } from "@/lib/spending-input";
import {
  fieldErrorResponse,
  invalidResponse,
  notFoundResponse,
  unauthorized,
} from "@/lib/api-responses";

const notFound = () => notFoundResponse("Income");

// GET /api/income/:id
export async function GET(_request: Request, ctx: RouteContext<"/api/income/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const income = await getIncome(user.id, id);
  return income ? NextResponse.json({ income }) : notFound();
}

// PATCH /api/income/:id -> edit (a received income updates its money movements too)
export async function PATCH(request: Request, ctx: RouteContext<"/api/income/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const body = await request.json().catch(() => null);
  const parsed = parseIncomeInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const income = await updateIncome(user.id, id, parsed.data);
    return income ? NextResponse.json({ income }) : notFound();
  } catch (error) {
    return fieldErrorResponse(error);
  }
}

// DELETE /api/income/:id -> also removes its money movements
export async function DELETE(_request: Request, ctx: RouteContext<"/api/income/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  try {
    const deleted = await deleteIncome(user.id, id);
    return deleted ? new NextResponse(null, { status: 204 }) : notFound();
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
