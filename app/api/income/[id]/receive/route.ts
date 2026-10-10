import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { receiveIncome, unreceiveIncome } from "@/lib/services/income.service";
import { parseReceiveInput } from "@/lib/income-input";
import { isUuid } from "@/lib/spending-input";
import {
  fieldErrorResponse,
  invalidResponse,
  notFoundResponse,
  unauthorized,
} from "@/lib/api-responses";

const notFound = () => notFoundResponse("Income");

// POST /api/income/:id/receive { receivedOn } -> mark as received
export async function POST(request: Request, ctx: RouteContext<"/api/income/[id]/receive">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const body = await request.json().catch(() => null);
  const parsed = parseReceiveInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const income = await receiveIncome(user.id, id, parsed.data.receivedOn);
    return income ? NextResponse.json({ income }) : notFound();
  } catch (error) {
    return fieldErrorResponse(error);
  }
}

// DELETE /api/income/:id/receive -> mark as NOT received
export async function DELETE(_request: Request, ctx: RouteContext<"/api/income/[id]/receive">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  try {
    const income = await unreceiveIncome(user.id, id);
    return income ? NextResponse.json({ income }) : notFound();
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
