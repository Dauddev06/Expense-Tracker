import { In } from "typeorm";
import { getRepo } from "@/lib/db/data-source";
import type { LedgerEntry } from "@/lib/db/entities/LedgerEntry";
import {
  BUILTIN_ACCOUNT_IDS,
  accountLabel,
  type AccountId,
} from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { todayString } from "@/lib/dates";
import {
  MONEY_ACTIONS,
  type MoneyActionInput,
  type OpeningInput,
} from "@/lib/money-input";
import {
  assertAllNonNegative,
  assertNoNegativeBalance,
  assertOwedNotNegative,
  moneyTransaction,
  readBalances,
  readOwedBySavings,
} from "./balance.service";
import { assertOwnAccounts, getUserAccounts } from "./savings-account.service";
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
    await assertOwnAccounts(m, userId, [input.fromAccount, input.toAccount], null);

    if (input.type === "savings_repay") {
      const owed = (await readOwedBySavings(m, userId))[input.toAccount!] ?? 0;
      const label = accountLabel(input.toAccount!, await getUserAccounts(userId));
      if (input.amount > owed) {
        throw new FieldError(
          "amount",
          owed > 0
            ? `You only owe ${label} ${formatMoney(owed)}.`
            : `You don't owe ${label} anything right now.`,
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
    // Delete it AND learn what it was, in one trip ("RETURNING type").
    // Only hand-made movements can be removed here (MONEY_ACTIONS).
    const result = await m
      .createQueryBuilder()
      .delete()
      .from("LedgerEntry")
      .where({ id, userId, type: In([...MONEY_ACTIONS]) })
      .returning(["type"])
      .execute();
    const deleted = (result.raw as { type: LedgerEntry["type"] }[])[0];
    if (!deleted) return false;

    await assertAllNonNegative(m, userId);
    if (deleted.type === "savings_borrow") await assertOwedNotNegative(m, userId);
    return true;
  });
}

// ---------- Starting balances ----------

export async function hasOpeningBalances(userId: string): Promise<boolean> {
  const repo = await getRepo("LedgerEntry");
  return (await repo.count({ where: { userId, type: "opening" } })) > 0;
}

export async function getOpeningBalances(userId: string): Promise<OpeningInput> {
  const repo = await getRepo("LedgerEntry");
  const rows = await repo.find({
    where: { userId, type: "opening", toAccount: In(BUILTIN_ACCOUNT_IDS) },
  });
  const result: OpeningInput = { current: 0, savings: 0, pocket: 0, sadqa: 0 };
  for (const row of rows) {
    result[row.toAccount as keyof OpeningInput] += row.amount;
  }
  return result;
}

// Replaces the starting balance of every built-in account (one "opening" row
// each). Extra savings accounts keep the starting amount they were opened with.
export async function setOpeningBalances(
  userId: string,
  input: OpeningInput,
): Promise<OpeningInput> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<LedgerEntry>("LedgerEntry");
    await repo.delete({ userId, type: "opening", toAccount: In(BUILTIN_ACCOUNT_IDS) });
    const occurredOn = todayString();
    await repo.save(
      BUILTIN_ACCOUNT_IDS.map((account) =>
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
    for (const account of BUILTIN_ACCOUNT_IDS) {
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
