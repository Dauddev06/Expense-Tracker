import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { addLoanPayment } from "@/lib/services/loan.service";
import { parseLoanPaymentInput } from "@/lib/loan-input";
import { isUuid } from "@/lib/spending-input";
import {
  fieldErrorResponse,
  invalidResponse,
  notFoundResponse,
  unauthorized,
} from "@/lib/api-responses";

// POST /api/loans/:id/payments -> a partial or full payment
export async function POST(request: Request, ctx: RouteContext<"/api/loans/[id]/payments">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFoundResponse("Loan");

  const body = await request.json().catch(() => null);
  const parsed = parseLoanPaymentInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const loan = await addLoanPayment(user.id, id, parsed.data);
    return loan ? NextResponse.json({ loan }, { status: 201 }) : notFoundResponse("Loan");
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
