import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  deleteRecurring,
  getRecurring,
  updateRecurring,
} from "@/lib/services/expected.service";
import { parseRecurringInput } from "@/lib/expected-input";
import { isUuid } from "@/lib/spending-input";
import { invalidResponse, notFoundResponse, unauthorized } from "@/lib/api-responses";

const notFound = () => notFoundResponse("Repeating expense");

// GET /api/recurring/:id
export async function GET(_request: Request, ctx: RouteContext<"/api/recurring/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const recurring = await getRecurring(user.id, id);
  return recurring ? NextResponse.json({ recurring }) : notFound();
}

// PATCH /api/recurring/:id -> edit, pause (active: false) or resume
export async function PATCH(request: Request, ctx: RouteContext<"/api/recurring/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const body = await request.json().catch(() => null);
  const parsed = parseRecurringInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  const recurring = await updateRecurring(user.id, id, parsed.data);
  return recurring ? NextResponse.json({ recurring }) : notFound();
}

// DELETE /api/recurring/:id -> delete template + its future unpaid occurrences
export async function DELETE(_request: Request, ctx: RouteContext<"/api/recurring/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const deleted = await deleteRecurring(user.id, id);
  return deleted ? new NextResponse(null, { status: 204 }) : notFound();
}
