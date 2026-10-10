import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { listRecurring } from "@/lib/services/expected.service";
import { unauthorized } from "@/lib/api-responses";

// GET /api/recurring -> all repeating expense templates
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  return NextResponse.json({ recurring: await listRecurring(user.id) });
}
