import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deleteLoanPayment } from "@/lib/services/loan.service";
import { isUuid } from "@/lib/spending-input";
import { fieldErrorResponse, notFoundResponse, unauthorized } from "@/lib/api-responses";

// DELETE /api/loans/:id/payments/:paymentId -> undo a payment
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/loans/[id]/payments/[paymentId]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id, paymentId } = await ctx.params;
  if (!isUuid(id) || !isUuid(paymentId)) return notFoundResponse("Payment");

  try {
    const loan = await deleteLoanPayment(user.id, id, paymentId);
    return loan ? NextResponse.json({ loan }) : notFoundResponse("Payment");
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
