import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createIncome, listIncomes } from "@/lib/services/income.service";
import { parseIncomeInput } from "@/lib/income-input";
import { readChapterParam } from "@/lib/dates";
import { fieldErrorResponse, invalidResponse, unauthorized } from "@/lib/api-responses";

// GET /api/income?chapter=2026-10 -> that month's income
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const chapter = readChapterParam(new URL(request.url).searchParams.get("chapter") ?? undefined);
  const incomes = await listIncomes(user.id, chapter);
  return NextResponse.json({ chapter, incomes });
}

// POST /api/income -> add an income (optionally already received)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = parseIncomeInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const income = await createIncome(user.id, parsed.data);
    return NextResponse.json({ income }, { status: 201 });
  } catch (error) {
    return fieldErrorResponse(error);
  }
}
