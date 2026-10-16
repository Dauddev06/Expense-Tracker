import { chapterOf, getAccountsChapter } from "./account.service";
import {
  ensureChapterOccurrences,
  listCarriedOver,
  listPlanned,
  summarizePlanned,
} from "./expected.service";
import { ensureThisMonthIncome, listIncomes } from "./income.service";
import { getUserAccounts } from "./savings-account.service";
import { getMonthSpending } from "./spending.service";
import { listDeposits } from "./ledger.service";
import { chapterEnd, chapterStart, currentChapter } from "@/lib/dates";

// Everything the Dashboard shows, for one month ("chapter"):
// each account from the start to the end of the month, and the month itself.
// (What's still to pay, loans and activity live on each account's own page.)
export async function getDashboard(userId: string, chapter: string) {
  const isThisMonth = chapter === currentChapter();
  // This month's repeating expenses must exist before we list what's still
  // to pay. Everything else doesn't need them, so it runs at the same time.
  const repeatingReady = ensureChapterOccurrences(userId, chapter);

  const [accounts, ledger, incomes, planned, carried, spending, deposits] = await Promise.all([
    getUserAccounts(userId),
    getAccountsChapter(userId, chapter),
    // New month: last month's "Every month" incomes are copied in first
    ensureThisMonthIncome(userId, chapter).then(() => listIncomes(userId, chapter)),
    repeatingReady.then(() => listPlanned(userId, chapter)),
    // Unpaid expected expenses from earlier months still count while it's this month
    isThisMonth ? listCarriedOver(userId, chapter) : Promise.resolve([]),
    getMonthSpending(userId, chapter),
    // Money added by hand this month, on top of income
    listDeposits(userId, chapterStart(chapter), chapterEnd(chapter)),
  ]);

  const incomeExpected = incomes.reduce((sum, i) => sum + i.amount, 0);
  const incomeReceived = incomes
    .filter((i) => i.status === "received")
    .reduce((sum, i) => sum + i.amount, 0);
  const toPay = summarizePlanned([...planned, ...carried]);
  // All your money at the end of the month (or now): every account except
  // Sadqa, which is only a reminder of what to give, not money.
  const total = accounts
    .filter((a) => a.value !== "sadqa")
    .reduce((sum, a) => sum + chapterOf(ledger, a.value).closing, 0);

  return {
    accounts,
    ledger,
    income: { expected: incomeExpected, received: incomeReceived },
    toPay: {
      ...toPay,
      pendingCount: planned.filter((p) => p.status === "pending").length + carried.length,
    },
    spending,
    added: {
      total: Math.round(deposits.reduce((sum, e) => sum + e.amount, 0) * 100) / 100,
      items: deposits,
    },
    total: Math.round(total * 100) / 100,
  };
}
