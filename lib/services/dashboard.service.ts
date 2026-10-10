import { getBalances, getOwedToSavings } from "./balance.service";
import { listActivity } from "./activity.service";
import { ensureChapterOccurrences, listPlanned, summarizePlanned } from "./expected.service";
import { listIncomes } from "./income.service";
import { listLoans, summarizeLoans } from "./loan.service";
import { getSpendingByCategory } from "./spending.service";

// Everything the Dashboard shows, for one month ("chapter").
// Balances are always "right now"; the rest is for the chosen month.
export async function getDashboard(userId: string, chapter: string) {
  await ensureChapterOccurrences(userId, chapter);

  const [balances, owedToSavings, loans, incomes, planned, byCategory, recent] =
    await Promise.all([
      getBalances(userId),
      getOwedToSavings(userId),
      listLoans(userId),
      listIncomes(userId, chapter),
      listPlanned(userId, chapter),
      getSpendingByCategory(userId, chapter),
      listActivity(userId, { limit: 8 }),
    ]);

  const incomeExpected = incomes.reduce((sum, i) => sum + i.amount, 0);
  const incomeReceived = incomes
    .filter((i) => i.status === "received")
    .reduce((sum, i) => sum + i.amount, 0);
  const spent = byCategory.reduce((sum, c) => sum + c.total, 0);

  return {
    balances,
    owedToSavings,
    loans: summarizeLoans(loans),
    income: { expected: incomeExpected, received: incomeReceived },
    expected: summarizePlanned(planned),
    pending: planned.filter((p) => p.status === "pending"),
    spending: { total: spent, byCategory },
    left: Math.round((incomeReceived - spent) * 100) / 100,
    recent,
  };
}
