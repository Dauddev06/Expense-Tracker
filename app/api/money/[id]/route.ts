import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deleteMoneyAction } from "@/lib/services/ledger.service";
import { isUuid } from "@/lib/spending-input";
import {
  fieldErrorResponse,
  notFoundResponse,
  unauthorized,
} from "@/lib/api-responses";

// DELETE /api/money/:id -> remove a movement that was added by hand
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/money/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFoundResponse("Movement");

  try {
    const deleted = await deleteMoneyAction(user.id, id);
    return deleted
      ? new NextResponse(null, { status: 204 })
      : notFoundResponse("Movement");
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
