import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getBalances, getOwedToSavings } from "@/lib/services/balance.service";
import { unauthorized } from "@/lib/api-responses";

// GET /api/accounts -> how much is in each account right now
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const [balances, owedToSavings] = await Promise.all([
    getBalances(user.id),
    getOwedToSavings(user.id),
  ]);
  return NextResponse.json({ balances, owedToSavings });
}
