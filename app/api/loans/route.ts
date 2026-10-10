import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createLoan, listLoans } from "@/lib/services/loan.service";
import { parseLoanInput } from "@/lib/loan-input";
import { fieldErrorResponse, invalidResponse, unauthorized } from "@/lib/api-responses";

// GET /api/loans -> all my loans with what is still outstanding
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  return NextResponse.json({ loans: await listLoans(user.id) });
}

// POST /api/loans -> I lent money (given) or borrowed money (taken)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = parseLoanInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const loan = await createLoan(user.id, parsed.data);
    return NextResponse.json({ loan }, { status: 201 });
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
