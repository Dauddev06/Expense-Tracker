import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createSpending, listSpendings } from "@/lib/services/spending.service";
import { parseSpendingInput } from "@/lib/spending-input";
import { isChapter } from "@/lib/dates";
import { fieldErrorResponse } from "@/lib/api-responses";

// GET /api/spendings?chapter=2026-10  -> list my spendings (optionally one month)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const chapter = new URL(request.url).searchParams.get("chapter");
  const spendings = await listSpendings(user.id, {
    chapter: isChapter(chapter) ? chapter : undefined,
  });
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

  try {
    const spending = await createSpending(user.id, parsed.data);
    return NextResponse.json({ spending }, { status: 201 });
  } catch (error) {
    // e.g. "You only have PKR 2,300 in Pocket." -> 400 under "amount"
    return fieldErrorResponse(error);
  }
}
