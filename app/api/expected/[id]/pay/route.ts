import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { markPlannedPaid, undoPlannedPaid } from "@/lib/services/expected.service";
import { parsePayInput } from "@/lib/expected-input";
import { isUuid } from "@/lib/spending-input";
import {
  fieldErrorResponse,
  invalidResponse,
  notFoundResponse,
  unauthorized,
} from "@/lib/api-responses";

const notFound = () => notFoundResponse("Expected expense");

// POST /api/expected/:id/pay { amount, account, paidOn } -> Mark as paid
export async function POST(request: Request, ctx: RouteContext<"/api/expected/[id]/pay">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const body = await request.json().catch(() => null);
  const parsed = parsePayInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const item = await markPlannedPaid(user.id, id, parsed.data);
    return item ? NextResponse.json({ item }) : notFound();
  } catch (error) {
    return fieldErrorResponse(error);
  }
}

// DELETE /api/expected/:id/pay -> Undo (deletes the spending it created)
export async function DELETE(_request: Request, ctx: RouteContext<"/api/expected/[id]/pay">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const item = await undoPlannedPaid(user.id, id);
  return item ? NextResponse.json({ item }) : notFound();
}
