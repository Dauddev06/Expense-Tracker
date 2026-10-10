import { randomBytes } from "crypto";
import { cache } from "react";
import { In, Not, type EntityManager } from "typeorm";
import { getDataSource, getRepo } from "@/lib/db/data-source";
import type { SavingsAccount } from "@/lib/db/entities/SavingsAccount";
import type { LedgerEntry } from "@/lib/db/entities/LedgerEntry";
import {
  accountLabel,
  buildAccounts,
  isBuiltinAccount,
  type AccountId,
  type AccountInfo,
  type ExtraSavingsId,
} from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { todayString } from "@/lib/dates";
import type { SavingsAccountInput, SavingsAccountUpdate } from "@/lib/money-input";
import { moneyTransaction, readBalances, readOwedBySavings } from "./balance.service";
import { FieldError } from "./errors";

export type SavingsAccountDTO = { key: ExtraSavingsId | "savings"; name: string };

// "sv_" + 10 random letters/digits, e.g. "sv_k3j9x2ab7q"
function newKey(): ExtraSavingsId {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(10);
  return `sv_${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

async function listRows(userId: string, includeClosed: boolean): Promise<SavingsAccount[]> {
  const repo = await getRepo("SavingsAccount");
  return repo.find({
    where: includeClosed ? { userId } : { userId, closed: false },
    order: { createdAt: "ASC" },
  });
}

// A row with key "savings" isn't an extra account: it only holds the new
// name the user gave the built-in Savings.
function toAccounts(rows: SavingsAccount[]): AccountInfo[] {
  const renamed = rows.find((r) => r.key === "savings");
  const extra = rows.filter((r) => r.key !== "savings").map((r) => ({ key: r.key, name: r.name }));
  return buildAccounts(extra, renamed?.name);
}

// The user's open accounts, ready for the UI (Current, Savings, extra savings,
// Pocket, Sadqa). cache() = asked for many times while rendering ONE page,
// the database is only asked once.
export const getUserAccounts = cache(async (userId: string): Promise<AccountInfo[]> => {
  return toAccounts(await listRows(userId, false));
});

// Includes closed accounts: for showing names in old activity.
export const getAllAccountNames = cache(async (userId: string): Promise<AccountInfo[]> => {
  return toAccounts(await listRows(userId, true));
});

// Throws when one of the accounts isn't the user's (or is closed).
// Built-in accounts always belong to everyone.
export async function assertOwnAccounts(
  m: EntityManager,
  userId: string,
  accounts: (AccountId | null | undefined)[],
  field: string | null = "account",
): Promise<void> {
  const extra = [...new Set(accounts.filter((a): a is AccountId => !!a && !isBuiltinAccount(a)))];
  if (extra.length === 0) return;
  const found = await m
    .getRepository<SavingsAccount>("SavingsAccount")
    .count({ where: { userId, key: In(extra), closed: false } });
  if (found !== extra.length) throw new FieldError(field, "That account doesn't exist any more. Pick another one.");
}

export async function createSavingsAccount(
  userId: string,
  input: SavingsAccountInput,
): Promise<SavingsAccountDTO> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<SavingsAccount>("SavingsAccount");
    const count = await repo.count({ where: { userId, closed: false, key: Not("savings") } });
    if (count >= 10) throw new FieldError("name", "You can have up to 10 extra savings accounts.");

    const saved = await repo.save(repo.create({ userId, key: newKey(), name: input.name, closed: false }));
    // What is already in it: a starting balance, like the built-in accounts have
    if (input.startingAmount > 0) {
      const ledger = m.getRepository<LedgerEntry>("LedgerEntry");
      await ledger.save(
        ledger.create({
          userId,
          type: "opening",
          amount: input.startingAmount,
          fromAccount: null,
          toAccount: saved.key as ExtraSavingsId,
          occurredOn: todayString(),
          note: null,
        }),
      );
    }
    return { key: saved.key as ExtraSavingsId, name: saved.name };
  });
}

// What an extra savings account started with (its "opening" movements)
export async function getStartingAmount(userId: string, key: string): Promise<number> {
  const ds = await getDataSource();
  const rows: { total: string }[] = await ds.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM ledger_entries
      WHERE "userId" = $1 AND type = 'opening' AND "toAccount" = $2`,
    [userId, key],
  );
  return Number(rows[0]?.total ?? 0);
}

// Edit a savings account:
// - name: any savings account, the built-in "savings" too
// - startingAmount: only extra ones (the built-in Savings changes it on the
//   "Change starting balances" page, with Current and Pocket). null = keep it.
export async function updateSavingsAccount(
  userId: string,
  key: string,
  input: SavingsAccountUpdate,
): Promise<SavingsAccountDTO | null> {
  return moneyTransaction(userId, async (m) => {
    if (key === "savings") {
      // The built-in one has no row of its own: store just its new name
      await m.query(
        `INSERT INTO savings_accounts ("userId", key, name) VALUES ($1, 'savings', $2)
         ON CONFLICT ("userId", key) DO UPDATE SET name = EXCLUDED.name`,
        [userId, input.name],
      );
      return { key: "savings", name: input.name };
    }

    const repo = m.getRepository<SavingsAccount>("SavingsAccount");
    const result = await repo.update({ userId, key, closed: false }, { name: input.name });
    if (!result.affected) return null;

    if (input.startingAmount !== null) {
      // Replace its starting amount (like the starting balances of Current etc.)
      const ledger = m.getRepository<LedgerEntry>("LedgerEntry");
      await ledger.delete({ userId, type: "opening", toAccount: key as ExtraSavingsId });
      if (input.startingAmount > 0) {
        await ledger.insert({
          userId,
          type: "opening",
          amount: input.startingAmount,
          fromAccount: null,
          toAccount: key as ExtraSavingsId,
          occurredOn: todayString(),
          note: null,
        });
      }
      // A lower amount must still cover what already went out of it
      const balance = (await readBalances(m, userId))[key as ExtraSavingsId] ?? 0;
      if (balance < 0) {
        throw new FieldError(
          "startingAmount",
          `More than this has already gone out of ${input.name}. It must start with at least ${formatMoney(input.startingAmount - balance)}.`,
        );
      }
    }
    return { key: key as ExtraSavingsId, name: input.name };
  });
}

// Closing only works on an empty account that nobody owes money to.
// The row stays (hidden), so old activity still shows its name.
export async function closeSavingsAccount(userId: string, key: string): Promise<boolean> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<SavingsAccount>("SavingsAccount");
    const row = await repo.findOne({ where: { userId, key, closed: false } });
    if (!row) return false;

    const accounts = await getAllAccountNames(userId);
    const label = accountLabel(key, accounts);
    const balance = (await readBalances(m, userId))[key as ExtraSavingsId] ?? 0;
    if (balance !== 0) {
      throw new FieldError(
        null,
        `${label} still has ${formatMoney(balance)} in it. Move the money to another account first.`,
      );
    }
    const owed = (await readOwedBySavings(m, userId))[key as ExtraSavingsId] ?? 0;
    if (owed > 0) {
      throw new FieldError(null, `You still owe ${label} ${formatMoney(owed)}. Pay it back first.`);
    }
    await repo.update({ id: row.id }, { closed: true });
    // If income was being saved into it, save into the built-in Savings instead
    await m.query(
      `UPDATE user_settings SET "savingsAccount" = 'savings' WHERE "userId" = $1 AND "savingsAccount" = $2`,
      [userId, key],
    );
    return true;
  });
}
