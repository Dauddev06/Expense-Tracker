import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createSpending, listSpendings } from "@/lib/services/spending.service";
import { parseSpendingInput } from "@/lib/spending-input";

// GET /api/spendings  -> list my spendings
export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const spendings = await listSpendings(user.id);
  return NextResponse.json({ spendings });
}

// POST /api/spendings -> create a spending
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = parseSpendingInput(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please fix the highlighted fields",
        fieldErrors: parsed.fieldErrors,
      },
      { status: 400 },
    );
  }

  const spending = await createSpending(user.id, parsed.data);
  return NextResponse.json({ spending }, { status: 201 });
}
