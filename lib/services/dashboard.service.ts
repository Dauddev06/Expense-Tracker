import { getAccountsChapter } from "./account.service";
import {
  ensureChapterOccurrences,
  listCarriedOver,
  listPlanned,
  summarizePlanned,
} from "./expected.service";
import { listIncomes } from "./income.service";
import { getUserAccounts } from "./savings-account.service";
import { getSpendingByCategory } from "./spending.service";
import { currentChapter } from "@/lib/dates";

// Everything the Dashboard shows, for one month ("chapter"):
// each account from the start to the end of the month, and the month itself.
// (Bills, loans and activity live on each account's own page.)
export async function getDashboard(userId: string, chapter: string) {
  await ensureChapterOccurrences(userId, chapter);
  const isThisMonth = chapter === currentChapter();

  const [accounts, ledger, incomes, planned, carried, byCategory] = await Promise.all([
    getUserAccounts(userId),
    getAccountsChapter(userId, chapter),
    listIncomes(userId, chapter),
    listPlanned(userId, chapter),
    // Unpaid bills from earlier months still count while it's this month
    isThisMonth ? listCarriedOver(userId, chapter) : Promise.resolve([]),
    getSpendingByCategory(userId, chapter),
  ]);

  const incomeExpected = incomes.reduce((sum, i) => sum + i.amount, 0);
  const incomeReceived = incomes
    .filter((i) => i.status === "received")
    .reduce((sum, i) => sum + i.amount, 0);
  const spent = byCategory.reduce((sum, c) => sum + c.total, 0);
  const bills = summarizePlanned([...planned, ...carried]);

  return {
    accounts,
    ledger,
    income: { expected: incomeExpected, received: incomeReceived },
    bills: {
      ...bills,
      pendingCount: planned.filter((p) => p.status === "pending").length + carried.length,
    },
    spending: { total: spent, byCategory },
    left: Math.round((incomeReceived - spent) * 100) / 100,
  };
}
