import { randomBytes } from "crypto";
import { cache } from "react";
import { In, type EntityManager } from "typeorm";
import { getRepo } from "@/lib/db/data-source";
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
import type { SavingsAccountInput } from "@/lib/money-input";
import { moneyTransaction, readBalances, readOwedBySavings } from "./balance.service";
import { FieldError } from "./errors";

export type SavingsAccountDTO = { key: ExtraSavingsId; name: string };

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

// The user's open accounts, ready for the UI (Current, Savings, extra savings,
// Pocket, Sadqa). cache() = asked for many times while rendering ONE page,
// the database is only asked once.
export const getUserAccounts = cache(async (userId: string): Promise<AccountInfo[]> => {
  const rows = await listRows(userId, false);
  return buildAccounts(rows.map((r) => ({ key: r.key, name: r.name })));
});

// Includes closed accounts: for showing names in old activity.
export const getAllAccountNames = cache(async (userId: string): Promise<AccountInfo[]> => {
  const rows = await listRows(userId, true);
  return buildAccounts(rows.map((r) => ({ key: r.key, name: r.name })));
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
    const count = await repo.count({ where: { userId, closed: false } });
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

export async function renameSavingsAccount(
  userId: string,
  key: string,
  name: string,
): Promise<SavingsAccountDTO | null> {
  const repo = await getRepo("SavingsAccount");
  // One UPDATE; "affected" tells us whether the account was found
  const result = await repo.update({ userId, key, closed: false }, { name });
  if (!result.affected) return null;
  return { key: key as ExtraSavingsId, name };
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
    return true;
  });
}
