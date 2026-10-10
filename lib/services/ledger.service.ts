import { In } from "typeorm";
import { getRepo } from "@/lib/db/data-source";
import type { LedgerEntry } from "@/lib/db/entities/LedgerEntry";
import {
  ACCOUNT_IDS,
  EMPTY_BALANCES,
  accountLabel,
  type AccountId,
  type Balances,
} from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { todayString } from "@/lib/dates";
import {
  MONEY_ACTIONS,
  type MoneyActionInput,
  type OpeningInput,
} from "@/lib/money-input";
import {
  assertNoNegativeBalance,
  assertOwedNotNegative,
  moneyTransaction,
  readBalances,
  readOwedToSavings,
} from "./balance.service";
import { FieldError } from "./errors";

export type LedgerEntryDTO = {
  id: string;
  type: LedgerEntry["type"];
  amount: number;
  fromAccount: AccountId | null;
  toAccount: AccountId | null;
  occurredOn: string;
  note: string | null;
};

function toDTO(e: LedgerEntry): LedgerEntryDTO {
  return {
    id: e.id,
    type: e.type,
    amount: e.amount,
    fromAccount: e.fromAccount,
    toAccount: e.toAccount,
    occurredOn: e.occurredOn,
    note: e.note,
  };
}

// Add money / Move money / Borrow from Savings / Repay Savings / Give Sadqa
export async function createMoneyAction(
  userId: string,
  input: MoneyActionInput,
): Promise<LedgerEntryDTO> {
  return moneyTransaction(userId, async (m) => {
    if (input.type === "savings_repay") {
      const owed = await readOwedToSavings(m, userId);
      if (input.amount > owed) {
        throw new FieldError(
          "amount",
          owed > 0
            ? `You only owe Savings ${formatMoney(owed)}.`
            : "You don't owe Savings anything right now.",
        );
      }
    }

    const repo = m.getRepository<LedgerEntry>("LedgerEntry");
    const saved = await repo.save(repo.create({ ...input, userId }));

    if (input.fromAccount) {
      await assertNoNegativeBalance(m, userId, [
        { account: input.fromAccount, field: "amount", requested: input.amount },
      ]);
    }
    return toDTO(saved);
  });
}

// Removes a movement the user added by hand on the Accounts page.
// (Income, loan and opening movements are changed on their own pages.)
export async function deleteMoneyAction(
  userId: string,
  id: string,
): Promise<boolean> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<LedgerEntry>("LedgerEntry");
    const entry = await repo.findOne({
      where: { id, userId, type: In([...MONEY_ACTIONS]) },
    });
    if (!entry) return false;

    await repo.delete({ id, userId });
    await assertNoNegativeBalance(
      m,
      userId,
      ACCOUNT_IDS.map((account) => ({ account, field: null })),
    );
    if (entry.type === "savings_borrow") await assertOwedNotNegative(m, userId);
    return true;
  });
}

// ---------- Starting balances ----------

export async function hasOpeningBalances(userId: string): Promise<boolean> {
  const repo = await getRepo("LedgerEntry");
  return (await repo.count({ where: { userId, type: "opening" } })) > 0;
}

export async function getOpeningBalances(userId: string): Promise<Balances> {
  const repo = await getRepo("LedgerEntry");
  const rows = await repo.find({ where: { userId, type: "opening" } });
  const result: Balances = { ...EMPTY_BALANCES };
  for (const row of rows) {
    if (row.toAccount) result[row.toAccount] += row.amount;
  }
  return result;
}

// Replaces the starting balance of every account (one "opening" row each).
export async function setOpeningBalances(
  userId: string,
  input: OpeningInput,
): Promise<Balances> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<LedgerEntry>("LedgerEntry");
    await repo.delete({ userId, type: "opening" });
    const occurredOn = todayString();
    await repo.save(
      ACCOUNT_IDS.map((account) =>
        repo.create({
          userId,
          type: "opening",
          amount: input[account],
          fromAccount: null,
          toAccount: account,
          occurredOn,
          note: null,
        }),
      ),
    );

    // A lower starting amount must still cover what was already spent.
    const balances = await readBalances(m, userId);
    for (const account of ACCOUNT_IDS) {
      if (balances[account] < 0) {
        const minimum = input[account] - balances[account];
        throw new FieldError(
          account,
          `You have already used more than this from ${accountLabel(account)}. It must start with at least ${formatMoney(minimum)}.`,
        );
      }
    }
    return input;
  });
}
