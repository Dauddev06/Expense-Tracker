import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/db/data-source";
import {
  EMPTY_BALANCES,
  accountLabel,
  isAccount,
  isBuiltinAccount,
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
// Sadqa is not money, only a reminder of what is still to give: income adds
// to it (sadqa_allocation, from nobody), and every Sadqa given takes it off
// again, whichever account the money itself came out of.
//
// One SQL query does all the sums for all accounts at once.
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
    UNION ALL
    SELECT 'sadqa', -amount
      FROM ledger_entries WHERE "userId" = $1 AND type = 'sadqa_given'
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
    if (isAccount(row.account)) balances[row.account] = Number(row.total);
  }
  return balances;
}

export async function getBalances(userId: string): Promise<Balances> {
  const ds = await getDataSource();
  return readBalances(ds.manager, userId);
}

// How much you owe each savings account, e.g. { savings: 5000, sv_k3j9...: 2000 }
// = everything borrowed from it minus what was paid back to it.
// (Plain transfers out of a savings account do NOT count as borrowing.)
// Accounts you owe nothing are left out.
export type OwedBySavings = Partial<Record<AccountId, number>>;

export async function readOwedBySavings(
  m: EntityManager,
  userId: string,
): Promise<OwedBySavings> {
  const rows: { account: string; owed: string }[] = await m.query(
    `SELECT account, SUM(delta) AS owed FROM (
        SELECT "fromAccount" AS account, amount AS delta
          FROM ledger_entries WHERE "userId" = $1 AND type = 'savings_borrow'
        UNION ALL
        SELECT "toAccount", -amount
          FROM ledger_entries WHERE "userId" = $1 AND type = 'savings_repay'
      ) AS debts
      GROUP BY account`,
    [userId],
  );
  const owed: OwedBySavings = {};
  for (const row of rows) {
    const amount = Number(row.owed);
    if (isAccount(row.account) && amount !== 0) owed[row.account] = amount;
  }
  return owed;
}

export async function getOwedBySavings(userId: string): Promise<OwedBySavings> {
  const ds = await getDataSource();
  return readOwedBySavings(ds.manager, userId);
}

export function totalOwed(owed: OwedBySavings): number {
  const sum = Object.values(owed).reduce((s: number, v) => s + (v ?? 0), 0);
  return Math.round(sum * 100) / 100;
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

// "Current", or the name the user gave an extra savings account
async function nameOf(m: EntityManager, userId: string, account: AccountId): Promise<string> {
  // (the built-in Savings can be renamed, so it is looked up too)
  if (isBuiltinAccount(account) && account !== "savings") return accountLabel(account);
  const rows: { name: string }[] = await m.query(
    `SELECT name FROM savings_accounts WHERE "userId" = $1 AND key = $2`,
    [userId, account],
  );
  return rows[0]?.name ?? accountLabel(account);
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
  // Already read them? Pass them in to save a trip to the database.
  balances?: Balances,
): Promise<void> {
  balances ??= await readBalances(m, userId);
  for (const check of checks) {
    const after = balances[check.account] ?? 0;
    if (after >= 0) continue;
    // Sadqa is a reminder, not money, so it gets its own words
    if (check.account === "sadqa") {
      throw new FieldError(
        check.field,
        check.requested !== undefined
          ? `You only have ${formatMoney(Math.max(after + check.requested, 0))} of Sadqa left to give.`
          : "This can't be done: you have already given more Sadqa than would be left to give. Remove a Sadqa you gave first.",
      );
    }
    const label = await nameOf(m, userId, check.account);
    const message =
      check.requested !== undefined
        ? `You only have ${formatMoney(Math.max(after + check.requested, 0))} in ${label}.`
        : `This can't be done: ${label} would go below zero (${formatMoney(after)}). Add money to ${label} first.`;
    throw new FieldError(check.field, message);
  }
}

// After any change to borrowing/repaying: what you owe a savings account
// can't go below 0.
export async function assertOwedNotNegative(
  m: EntityManager,
  userId: string,
): Promise<void> {
  const owed = await readOwedBySavings(m, userId);
  if (Object.values(owed).some((amount) => (amount ?? 0) < 0)) {
    throw new FieldError(
      null,
      "This can't be done: you would have paid a savings account back more than you borrowed. Remove a repayment first.",
    );
  }
}

// Every account the user has must still be at 0 or more (used after a delete,
// which can take money back out of any account).
export async function assertAllNonNegative(m: EntityManager, userId: string): Promise<void> {
  const balances = await readBalances(m, userId);
  await assertNoNegativeBalance(
    m,
    userId,
    (Object.keys(balances) as AccountId[]).map((account) => ({ account, field: null })),
    balances, // (reuse them: no second read)
  );
}
