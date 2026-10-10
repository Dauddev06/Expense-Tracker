import { getDataSource } from "@/lib/db/data-source";
import type { AccountId } from "@/lib/accounts";
import { chapterEnd, chapterStart } from "@/lib/dates";

export type AccountMonth = {
  moneyIn: number; // came into this account during the month
  moneyOut: number; // left it (movements + spendings)
  spent: number; // just the spendings part of moneyOut
  byCategory: { category: string; total: number }[]; // spendings from this account
};

// One account, one month: how much came in, how much went out, and what
// was spent from it. (Starting balances are not "money in", so they are skipped.)
export async function getAccountMonth(
  userId: string,
  account: AccountId,
  chapter: string,
): Promise<AccountMonth> {
  const ds = await getDataSource();
  const params = [userId, account, chapterStart(chapter), chapterEnd(chapter)];

  const [moves, categories] = await Promise.all([
    ds.query(
      `SELECT COALESCE(SUM(CASE WHEN "toAccount" = $2 THEN amount ELSE 0 END), 0) AS "in",
              COALESCE(SUM(CASE WHEN "fromAccount" = $2 THEN amount ELSE 0 END), 0) AS "out"
         FROM ledger_entries
        WHERE "userId" = $1 AND type <> 'opening' AND "occurredOn" BETWEEN $3 AND $4`,
      params,
    ) as Promise<{ in: string; out: string }[]>,
    ds.query(
      `SELECT category, SUM(amount) AS total
         FROM spendings
        WHERE "userId" = $1 AND account = $2 AND "spentOn" BETWEEN $3 AND $4
        GROUP BY category
        ORDER BY total DESC`,
      params,
    ) as Promise<{ category: string; total: string }[]>,
  ]);

  const byCategory = categories.map((c) => ({ category: c.category, total: Number(c.total) }));
  const spent = byCategory.reduce((sum, c) => sum + c.total, 0);
  return {
    moneyIn: Number(moves[0]?.in ?? 0),
    moneyOut: Number(moves[0]?.out ?? 0) + spent,
    spent,
    byCategory,
  };
}
