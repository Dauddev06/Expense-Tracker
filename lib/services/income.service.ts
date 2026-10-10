import type { EntityManager } from "typeorm";
import { getRepo } from "@/lib/db/data-source";
import type { Income, IncomeStatus } from "@/lib/db/entities/Income";
import type { LedgerEntry } from "@/lib/db/entities/LedgerEntry";
import type { AccountId } from "@/lib/accounts";
import type { IncomeInput, ReceiveInput, SavingsChoice } from "@/lib/income-input";
import { assertAllNonNegative, moneyTransaction } from "./balance.service";
import { assertOwnAccounts } from "./savings-account.service";
import { assertPercentsFit, readSettings } from "./settings.service";
import { FieldError } from "./errors";

export type IncomeDTO = {
  id: string;
  chapter: string;
  title: string;
  amount: number;
  status: IncomeStatus;
  receivedOn: string | null;
  sadqaPercentApplied: number | null;
  sadqaAmount: number; // how much of it went to Sadqa (0 if not received)
  savingsPercentApplied: number | null;
  savingsAccountApplied: string | null; // which savings account got its part
  savingsAmount: number; // how much of it was saved (0 if not received)
};

// amount × percent, rounded to whole paisa: 100000 × 2.5% = 2500
export function sadqaFor(amount: number, percent: number): number {
  return Math.round(amount * percent) / 100;
}
// (the same sum, for the savings part)
export const savingsFor = sadqaFor;

function toDTO(i: Income): IncomeDTO {
  const received = i.status === "received";
  return {
    id: i.id,
    chapter: i.chapter,
    title: i.title,
    amount: i.amount,
    status: i.status,
    receivedOn: i.receivedOn,
    sadqaPercentApplied: i.sadqaPercentApplied,
    sadqaAmount: received ? sadqaFor(i.amount, i.sadqaPercentApplied ?? 0) : 0,
    savingsPercentApplied: i.savingsPercentApplied,
    savingsAccountApplied: i.savingsAccountApplied,
    savingsAmount: received ? savingsFor(i.amount, i.savingsPercentApplied ?? 0) : 0,
  };
}

// Writes the money movements for a received income, in ONE insert:
//   1. income:             the full amount INTO Current
//   2. sadqa_allocation:   the Sadqa part from Current INTO Sadqa
//   3. savings_allocation: the savings part from Current INTO a savings account
async function writeIncomeEntries(m: EntityManager, income: Income) {
  const common = {
    userId: income.userId,
    incomeId: income.id,
    occurredOn: income.receivedOn!,
    note: null,
  };
  const rows: Partial<LedgerEntry>[] = [
    { ...common, type: "income", amount: income.amount, fromAccount: null, toAccount: "current" },
  ];
  const sadqa = sadqaFor(income.amount, income.sadqaPercentApplied ?? 0);
  if (sadqa > 0) {
    rows.push({ ...common, type: "sadqa_allocation", amount: sadqa, fromAccount: "current", toAccount: "sadqa" });
  }
  const saved = savingsFor(income.amount, income.savingsPercentApplied ?? 0);
  if (saved > 0 && income.savingsAccountApplied) {
    rows.push({
      ...common,
      type: "savings_allocation",
      amount: saved,
      fromAccount: "current",
      toAccount: income.savingsAccountApplied as AccountId,
    });
  }
  await m.getRepository<LedgerEntry>("LedgerEntry").insert(rows);
}

async function deleteIncomeEntries(m: EntityManager, income: Income) {
  await m
    .getRepository<LedgerEntry>("LedgerEntry")
    .delete({ incomeId: income.id, userId: income.userId });
}

// Puts the savings choice on the income: what was picked when it arrived,
// otherwise the user's Settings. Checks it fits next to the Sadqa %.
async function applySavings(m: EntityManager, income: Income, choice: SavingsChoice | null) {
  const settings = await readSettings(m, income.userId);
  const pick = choice ?? { percent: settings.savingsPercent, account: settings.savingsAccount };
  assertPercentsFit(income.sadqaPercentApplied ?? 0, pick.percent, "savingsPercent");
  if (pick.percent > 0) {
    await assertOwnAccounts(m, income.userId, [pick.account as AccountId], "savingsAccount");
  }
  income.savingsPercentApplied = pick.percent > 0 ? pick.percent : null;
  income.savingsAccountApplied = pick.percent > 0 ? pick.account : null;
}

async function markReceived(m: EntityManager, income: Income, receivedOn: string, savings: SavingsChoice | null) {
  // Save the %s used today, so a later change in Settings never rewrites history
  const { sadqaPercent } = await readSettings(m, income.userId);
  income.status = "received";
  income.receivedOn = receivedOn;
  income.sadqaPercentApplied = sadqaPercent;
  await applySavings(m, income, savings);
  await m.getRepository<Income>("Income").save(income);
  await writeIncomeEntries(m, income);
}

function clearReceived(income: Income) {
  income.status = "expected";
  income.receivedOn = null;
  income.sadqaPercentApplied = null;
  income.savingsPercentApplied = null;
  income.savingsAccountApplied = null;
}

export async function listIncomes(userId: string, chapter: string): Promise<IncomeDTO[]> {
  const repo = await getRepo("Income");
  const rows = await repo.find({ where: { userId, chapter }, order: { createdAt: "ASC" } });
  return rows.map(toDTO);
}

export async function getIncome(userId: string, id: string): Promise<IncomeDTO | null> {
  const repo = await getRepo("Income");
  const row = await repo.findOne({ where: { id, userId } });
  return row ? toDTO(row) : null;
}

export async function createIncome(userId: string, input: IncomeInput): Promise<IncomeDTO> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<Income>("Income");
    const income = repo.create({ userId, chapter: input.chapter, title: input.title, amount: input.amount });
    clearReceived(income);
    await repo.save(income);
    if (input.received) await markReceived(m, income, input.receivedOn!, input.savings);
    return toDTO(income);
  });
}

export async function updateIncome(
  userId: string,
  id: string,
  input: IncomeInput,
): Promise<IncomeDTO | null> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<Income>("Income");
    const income = await repo.findOne({ where: { id, userId } });
    if (!income) return null;

    const wasReceived = income.status === "received";
    income.chapter = input.chapter;
    income.title = input.title;
    income.amount = input.amount;

    if (wasReceived) {
      // Remove the old money movements; re-create them below if still received
      await deleteIncomeEntries(m, income);
    }
    if (wasReceived && input.received) {
      // Keep the %s that were used when it was first received
      // (unless a new savings choice was sent)
      income.receivedOn = input.receivedOn;
      if (input.savings) await applySavings(m, income, input.savings);
      await repo.save(income);
      await writeIncomeEntries(m, income);
    } else if (!wasReceived && input.received) {
      await markReceived(m, income, input.receivedOn!, input.savings);
    } else {
      clearReceived(income);
      await repo.save(income);
    }

    // Taking money back out can't leave an account below zero (e.g. if the
    // Sadqa or savings part was already given away or moved)
    await assertAllNonNegative(m, userId);
    return toDTO(income);
  });
}

export async function receiveIncome(
  userId: string,
  id: string,
  input: ReceiveInput,
): Promise<IncomeDTO | null> {
  return moneyTransaction(userId, async (m) => {
    const income = await m.getRepository<Income>("Income").findOne({ where: { id, userId } });
    if (!income) return null;
    if (income.status === "received") {
      throw new FieldError(null, "This income is already marked as received.");
    }
    await markReceived(m, income, input.receivedOn, input.savings);
    return toDTO(income);
  });
}

// "Not received yet": removes its money movements again.
export async function unreceiveIncome(userId: string, id: string): Promise<IncomeDTO | null> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<Income>("Income");
    const income = await repo.findOne({ where: { id, userId } });
    if (!income) return null;
    if (income.status !== "received") return toDTO(income);

    await deleteIncomeEntries(m, income);
    clearReceived(income);
    await repo.save(income);
    await assertAllNonNegative(m, userId);
    return toDTO(income);
  });
}

export async function deleteIncome(userId: string, id: string): Promise<boolean> {
  return moneyTransaction(userId, async (m) => {
    // ON DELETE CASCADE removes its money movements too
    const result = await m.getRepository<Income>("Income").delete({ id, userId });
    if ((result.affected ?? 0) === 0) return false;
    await assertAllNonNegative(m, userId);
    return true;
  });
}
