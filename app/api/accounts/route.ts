import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getBalances, getOwedBySavings } from "@/lib/services/balance.service";
import { getUserAccounts } from "@/lib/services/savings-account.service";
import { unauthorized } from "@/lib/api-responses";

// GET /api/accounts -> your accounts, how much is in each one right now,
// and how much you owe each savings account
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const [accounts, balances, owedBySavings] = await Promise.all([
    getUserAccounts(user.id),
    getBalances(user.id),
    getOwedBySavings(user.id),
  ]);
  return NextResponse.json({ accounts, balances, owedBySavings });
}
