import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deletePlanned, getPlanned, updatePlanned } from "@/lib/services/expected.service";
import { parsePlannedEditInput } from "@/lib/expected-input";
import { isUuid } from "@/lib/spending-input";
import {
  fieldErrorResponse,
  invalidResponse,
  notFoundResponse,
  unauthorized,
} from "@/lib/api-responses";

const notFound = () => notFoundResponse("Expected expense");

// GET /api/expected/:id
export async function GET(_request: Request, ctx: RouteContext<"/api/expected/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const item = await getPlanned(user.id, id);
  return item ? NextResponse.json({ item }) : notFound();
}

// PATCH /api/expected/:id -> edit ONE occurrence
export async function PATCH(request: Request, ctx: RouteContext<"/api/expected/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const body = await request.json().catch(() => null);
  const parsed = parsePlannedEditInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const item = await updatePlanned(user.id, id, parsed.data);
    return item ? NextResponse.json({ item }) : notFound();
  } catch (error) {
    return fieldErrorResponse(error);
  }
}

// DELETE /api/expected/:id -> remove ONE occurrence
export async function DELETE(_request: Request, ctx: RouteContext<"/api/expected/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  try {
    const deleted = await deletePlanned(user.id, id);
    return deleted ? new NextResponse(null, { status: 204 }) : notFound();
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
