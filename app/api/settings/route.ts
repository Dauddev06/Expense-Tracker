import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSettings, updateSettings } from "@/lib/services/settings.service";
import { parseSettingsInput } from "@/lib/income-input";
import { fieldErrorResponse, invalidResponse, unauthorized } from "@/lib/api-responses";

// GET /api/settings
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  return NextResponse.json({ settings: await getSettings(user.id) });
}

// PUT /api/settings { sadqaPercent?, savingsPercent?, savingsAccount? }
// Only the parts that are sent are changed.
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = parseSettingsInput(body);
  if (!parsed.success) return invalidResponse(parsed.fieldErrors);

  try {
    const settings = await updateSettings(user.id, parsed.data);
    return NextResponse.json({ settings });
  } catch (error) {
    return fieldErrorResponse(error); // e.g. a savings account that was closed
  }
}
