import { getDataSource } from "@/lib/db/data-source";
import { isAccount, type AccountId } from "@/lib/accounts";
import { chapterEnd, chapterStart } from "@/lib/dates";

// One account in one month, like a page in a bank statement:
//   opening (carried over from last month) + moneyIn - moneyOut = closing
// Nothing is "reset" when a new month starts: the money left at the end of
// September is exactly what October opens with.
export type AccountChapter = {
  opening: number;
  moneyIn: number;
  moneyOut: number; // movements out + spendings
  closing: number;
};

const ZERO: AccountChapter = { opening: 0, moneyIn: 0, moneyOut: 0, closing: 0 };

// Starting balances ("opening" rows) belong to the month they were entered in
// and every month after it, so they count towards the opening, never "money in".
const CHAPTER_SQL = `
  SELECT account,
    COALESCE(SUM(CASE WHEN (type <> 'opening' AND day < $2) OR (type = 'opening' AND day <= $3)
                      THEN delta ELSE 0 END), 0) AS opening,
    COALESCE(SUM(CASE WHEN type <> 'opening' AND day BETWEEN $2 AND $3 AND delta > 0
                      THEN delta ELSE 0 END), 0) AS "in",
    COALESCE(SUM(CASE WHEN type <> 'opening' AND day BETWEEN $2 AND $3 AND delta < 0
                      THEN -delta ELSE 0 END), 0) AS "out"
  FROM (
    SELECT "toAccount" AS account, amount AS delta, type, "occurredOn" AS day
      FROM ledger_entries WHERE "userId" = $1 AND "toAccount" IS NOT NULL
    UNION ALL
    SELECT "fromAccount", -amount, type, "occurredOn"
      FROM ledger_entries WHERE "userId" = $1 AND "fromAccount" IS NOT NULL
    UNION ALL
    SELECT account, -amount, 'spending', "spentOn"
      FROM spendings WHERE "userId" = $1
  ) AS moves
  WHERE day <= $3
  GROUP BY account`;

const round = (n: number) => Math.round(n * 100) / 100;

// Every account at once, for one month. Accounts with nothing are left out:
// read them with chapterOf().
export async function getAccountsChapter(
  userId: string,
  chapter: string,
): Promise<Partial<Record<AccountId, AccountChapter>>> {
  const ds = await getDataSource();
  const rows: { account: string; opening: string; in: string; out: string }[] = await ds.query(
    CHAPTER_SQL,
    [userId, chapterStart(chapter), chapterEnd(chapter)],
  );
  const result: Partial<Record<AccountId, AccountChapter>> = {};
  for (const row of rows) {
    if (!isAccount(row.account)) continue;
    const opening = Number(row.opening);
    const moneyIn = Number(row.in);
    const moneyOut = Number(row.out);
    result[row.account] = { opening, moneyIn, moneyOut, closing: round(opening + moneyIn - moneyOut) };
  }
  return result;
}

export function chapterOf(
  all: Partial<Record<AccountId, AccountChapter>>,
  account: AccountId,
): AccountChapter {
  return all[account] ?? ZERO;
}
