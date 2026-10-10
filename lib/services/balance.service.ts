import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/db/data-source";
import {
  ACCOUNT_IDS,
  EMPTY_BALANCES,
  accountLabel,
  type AccountId,
  type Balances,
} from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { FieldError } from "./errors";

// ---------------------------------------------------------------------------
// How a balance is calculated (nothing is ever stored as a running total):
//
//   balance(A) = SUM(ledger amounts where toAccount = A)
//              - SUM(ledger amounts where fromAccount = A)
//              - SUM(spendings where account = A)
//
// One SQL query does all three sums for all four accounts at once.
// ---------------------------------------------------------------------------
const BALANCES_SQL = `
  SELECT account, COALESCE(SUM(delta), 0) AS total
  FROM (
    SELECT "toAccount" AS account, amount AS delta
      FROM ledger_entries WHERE "userId" = $1 AND "toAccount" IS NOT NULL
    UNION ALL
    SELECT "fromAccount", -amount
      FROM ledger_entries WHERE "userId" = $1 AND "fromAccount" IS NOT NULL
    UNION ALL
    SELECT account, -amount
      FROM spendings WHERE "userId" = $1
  ) AS moves
  GROUP BY account`;

// Works with the normal connection OR inside a transaction (pass the
// transaction's EntityManager so we see the rows it has just written).
export async function readBalances(
  m: EntityManager,
  userId: string,
): Promise<Balances> {
  const rows: { account: string; total: string }[] = await m.query(
    BALANCES_SQL,
    [userId],
  );
  const balances: Balances = { ...EMPTY_BALANCES };
  for (const row of rows) {
    if (ACCOUNT_IDS.includes(row.account as AccountId)) {
      balances[row.account as AccountId] = Number(row.total);
    }
  }
  return balances;
}

export async function getBalances(
  userId: string,
): Promise<Balances & { total: number }> {
  const ds = await getDataSource();
  const balances = await readBalances(ds.manager, userId);
  const total = ACCOUNT_IDS.reduce((sum, a) => sum + balances[a], 0);
  return { ...balances, total: Math.round(total * 100) / 100 };
}

// "Owed to Savings" = everything borrowed from Savings minus what was repaid.
// (Plain transfers out of Savings do NOT count as borrowing.)
export async function readOwedToSavings(
  m: EntityManager,
  userId: string,
): Promise<number> {
  const rows: { owed: string }[] = await m.query(
    `SELECT COALESCE(SUM(CASE WHEN type = 'savings_borrow' THEN amount
                              WHEN type = 'savings_repay' THEN -amount
                              ELSE 0 END), 0) AS owed
       FROM ledger_entries WHERE "userId" = $1`,
    [userId],
  );
  return Number(rows[0]?.owed ?? 0);
}

export async function getOwedToSavings(userId: string): Promise<number> {
  const ds = await getDataSource();
  return readOwedToSavings(ds.manager, userId);
}

// Runs `work` inside ONE database transaction, and first takes a lock that
// belongs to this user. Two requests from the same user (e.g. a double
// click) therefore run one after the other, so both can't pass the
// "enough money?" check at the same time. If `work` throws, everything it
// wrote is rolled back.
export async function moneyTransaction<T>(
  userId: string,
  work: (m: EntityManager) => Promise<T>,
): Promise<T> {
  const ds = await getDataSource();
  return ds.transaction(async (m) => {
    await m.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
    return work(m);
  });
}

export type MoneyCheck = {
  account: AccountId;
  // The form field the error should appear under (null = whole form)
  field: string | null;
  // How much the user asked to take out of this account. Used to write
  // "You only have PKR 2,300 in Pocket." (available = balance after + this)
  requested?: number;
};

// Call this INSIDE moneyTransaction, AFTER writing the change.
// If any checked account is now below 0 it throws, which rolls the change back.
export async function assertNoNegativeBalance(
  m: EntityManager,
  userId: string,
  checks: MoneyCheck[],
): Promise<void> {
  const balances = await readBalances(m, userId);
  for (const check of checks) {
    const after = balances[check.account];
    if (after >= 0) continue;
    const label = accountLabel(check.account);
    const message =
      check.requested !== undefined
        ? `You only have ${formatMoney(Math.max(after + check.requested, 0))} in ${label}.`
        : `This can't be done: ${label} would go below zero (${formatMoney(after)}). Add money to ${label} first.`;
    throw new FieldError(check.field, message);
  }
}

// After any change to borrowing/repaying: "owed to Savings" can't go below 0.
export async function assertOwedNotNegative(
  m: EntityManager,
  userId: string,
): Promise<void> {
  const owed = await readOwedToSavings(m, userId);
  if (owed < 0) {
    throw new FieldError(
      null,
      "This can't be done: you would have paid Savings back more than you borrowed. Remove a repayment first.",
    );
  }
}
