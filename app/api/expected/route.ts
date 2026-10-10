import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  createExpected,
  ensureChapterOccurrences,
  listPlanned,
} from "@/lib/services/expected.service";
import { parseExpectedInput } from "@/lib/expected-input";
import { readChapterParam } from "@/lib/dates";
import { invalidResponse, unauthorized } from "@/lib/api-responses";

// GET /api/expected?chapter=2026-10 -> that month's expected expenses
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const chapter = readChapterParam(new URL(request.url).searchParams.get("chapter") ?? undefined);
  await ensureChapterOccurrences(user.id, chapter);
  const items = await listPlanned(user.id, chapter);
  return NextResponse.json({ chapter, items });
}

// POST /api/expected -> add a one-time or repeating expected expense
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = parseExpectedInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  const result = await createExpected(user.id, parsed.data);
  return NextResponse.json(result, { status: 201 });
}
