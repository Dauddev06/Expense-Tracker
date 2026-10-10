import type { EntityManager } from "typeorm";
import { getRepo } from "@/lib/db/data-source";
import type { Income, IncomeStatus } from "@/lib/db/entities/Income";
import type { LedgerEntry } from "@/lib/db/entities/LedgerEntry";
import type { IncomeInput } from "@/lib/income-input";
import { assertNoNegativeBalance, moneyTransaction } from "./balance.service";
import { readSettings } from "./settings.service";
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
};

// amount × percent, rounded to whole paisa: 100000 × 2.5% = 2500
export function sadqaFor(amount: number, percent: number): number {
  return Math.round(amount * percent) / 100;
}

function toDTO(i: Income): IncomeDTO {
  return {
    id: i.id,
    chapter: i.chapter,
    title: i.title,
    amount: i.amount,
    status: i.status,
    receivedOn: i.receivedOn,
    sadqaPercentApplied: i.sadqaPercentApplied,
    sadqaAmount:
      i.status === "received" ? sadqaFor(i.amount, i.sadqaPercentApplied ?? 0) : 0,
  };
}

// Writes the two money movements for a received income:
//   1. income:           the full amount INTO Current
//   2. sadqa_allocation: the Sadqa part from Current INTO Sadqa
async function writeIncomeEntries(m: EntityManager, income: Income) {
  const repo = m.getRepository<LedgerEntry>("LedgerEntry");
  const common = {
    userId: income.userId,
    incomeId: income.id,
    occurredOn: income.receivedOn!,
    note: null,
  };
  await repo.save(
    repo.create({ ...common, type: "income", amount: income.amount, fromAccount: null, toAccount: "current" }),
  );
  const sadqa = sadqaFor(income.amount, income.sadqaPercentApplied ?? 0);
  if (sadqa > 0) {
    await repo.save(
      repo.create({ ...common, type: "sadqa_allocation", amount: sadqa, fromAccount: "current", toAccount: "sadqa" }),
    );
  }
}

async function deleteIncomeEntries(m: EntityManager, income: Income) {
  await m
    .getRepository<LedgerEntry>("LedgerEntry")
    .delete({ incomeId: income.id, userId: income.userId });
}

// Taking income back out can't leave Current or Sadqa below zero
// (e.g. if the Sadqa part was already given away).
function checkCurrentAndSadqa(m: EntityManager, userId: string, field: string | null) {
  return assertNoNegativeBalance(m, userId, [
    { account: "current", field },
    { account: "sadqa", field },
  ]);
}

async function markReceived(m: EntityManager, income: Income, receivedOn: string) {
  // Save the % used today, so a later change in Settings never rewrites history
  const { sadqaPercent } = await readSettings(m, income.userId);
  income.status = "received";
  income.receivedOn = receivedOn;
  income.sadqaPercentApplied = sadqaPercent;
  await m.getRepository<Income>("Income").save(income);
  await writeIncomeEntries(m, income);
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
    const income = await repo.save(
      repo.create({
        userId,
        chapter: input.chapter,
        title: input.title,
        amount: input.amount,
        status: "expected",
        receivedOn: null,
        sadqaPercentApplied: null,
      }),
    );
    if (input.received) await markReceived(m, income, input.receivedOn!);
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
      // Keep the Sadqa % that was used when it was first received
      income.receivedOn = input.receivedOn;
      await repo.save(income);
      await writeIncomeEntries(m, income);
    } else if (!wasReceived && input.received) {
      await markReceived(m, income, input.receivedOn!);
    } else {
      income.status = "expected";
      income.receivedOn = null;
      income.sadqaPercentApplied = null;
      await repo.save(income);
    }

    await checkCurrentAndSadqa(m, userId, "amount");
    return toDTO(income);
  });
}

export async function receiveIncome(
  userId: string,
  id: string,
  receivedOn: string,
): Promise<IncomeDTO | null> {
  return moneyTransaction(userId, async (m) => {
    const income = await m.getRepository<Income>("Income").findOne({ where: { id, userId } });
    if (!income) return null;
    if (income.status === "received") {
      throw new FieldError(null, "This income is already marked as received.");
    }
    await markReceived(m, income, receivedOn);
    return toDTO(income);
  });
}

// "Not received yet": removes both money movements again.
export async function unreceiveIncome(userId: string, id: string): Promise<IncomeDTO | null> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<Income>("Income");
    const income = await repo.findOne({ where: { id, userId } });
    if (!income) return null;
    if (income.status !== "received") return toDTO(income);

    await deleteIncomeEntries(m, income);
    income.status = "expected";
    income.receivedOn = null;
    income.sadqaPercentApplied = null;
    await repo.save(income);
    await checkCurrentAndSadqa(m, userId, null);
    return toDTO(income);
  });
}

export async function deleteIncome(userId: string, id: string): Promise<boolean> {
  return moneyTransaction(userId, async (m) => {
    // ON DELETE CASCADE removes its money movements too
    const result = await m.getRepository<Income>("Income").delete({ id, userId });
    if ((result.affected ?? 0) === 0) return false;
    await checkCurrentAndSadqa(m, userId, null);
    return true;
  });
}
