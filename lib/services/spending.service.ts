import { Between } from "typeorm";
import { getRepo } from "@/lib/db/data-source";
import type { Spending } from "@/lib/db/entities/Spendings";
import type { PlannedExpense } from "@/lib/db/entities/PlannedExpense";
import type { SpendingInput } from "@/lib/spending-input";
import type { SpendingAccount } from "@/lib/accounts";
import { chapterEnd, chapterStart } from "@/lib/dates";
import { assertNoNegativeBalance, moneyTransaction } from "./balance.service";
import { assertOwnAccounts } from "./savings-account.service";

// What we send to the browser. Plain data only (no class instances, no Dates)
export type SpendingDTO = {
  id: string;
  title: string;
  amount: number;
  category: string;
  spentOn: string;
  note: string | null;
  account: SpendingAccount;
};

export function toSpendingDTO(s: Spending): SpendingDTO {
  return {
    id: s.id,
    title: s.title,
    amount: s.amount,
    category: s.category,
    spentOn: s.spentOn,
    note: s.note,
    account: s.account,
  };
}

// EVERY query filters by userId. That is what stops user A from
// reading/editing/deleting user B's spendings.

export async function listSpendings(
  userId: string,
  options: { limit?: number; chapter?: string } = {},
): Promise<SpendingDTO[]> {
  const repo = await getRepo("Spending");
  const rows = await repo.find({
    where: options.chapter
      ? {
          userId,
          spentOn: Between(
            chapterStart(options.chapter),
            chapterEnd(options.chapter),
          ),
        }
      : { userId },
    order: { spentOn: "DESC", createdAt: "DESC" },
    take: options.limit,
  });
  return rows.map(toSpendingDTO);
}

export async function createSpending(
  userId: string,
  input: SpendingInput,
): Promise<SpendingDTO> {
  // Save + "is there enough money?" check in ONE transaction:
  // if the account would go below 0 the insert is rolled back.
  return moneyTransaction(userId, async (m) => {
    await assertOwnAccounts(m, userId, [input.account]);
    const repo = m.getRepository<Spending>("Spending");
    const saved = await repo.save(repo.create({ ...input, userId }));
    await assertNoNegativeBalance(m, userId, [
      { account: input.account, field: "amount", requested: input.amount },
    ]);
    return toSpendingDTO(saved);
  });
}

export async function getSpending(
  userId: string,
  id: string,
): Promise<SpendingDTO | null> {
  const repo = await getRepo("Spending");
  const row = await repo.findOne({ where: { id, userId } });
  return row ? toSpendingDTO(row) : null;
}

export async function updateSpending(
  userId: string,
  id: string,
  input: SpendingInput,
): Promise<SpendingDTO | null> {
  return moneyTransaction(userId, async (m) => {
    const repo = m.getRepository<Spending>("Spending");
    const existing = await repo.findOne({ where: { id, userId } });
    if (!existing) return null;
    if (existing.account !== input.account) await assertOwnAccounts(m, userId, [input.account]);

    repo.merge(existing, input); // copy the new values onto the loaded entity
    const saved = await repo.save(existing);
    await assertNoNegativeBalance(m, userId, [
      { account: input.account, field: "amount", requested: input.amount },
    ]);
    return toSpendingDTO(saved);
  });
}

export async function deleteSpending(
  userId: string,
  id: string,
): Promise<boolean> {
  return moneyTransaction(userId, async (m) => {
    // If this spending was made by "Mark as paid" on an expected expense,
    // that expense goes back to "still to pay".
    await m
      .getRepository<PlannedExpense>("PlannedExpense")
      .update(
        { spendingId: id, userId },
        { status: "pending", spendingId: null },
      );
    const result = await m
      .getRepository<Spending>("Spending")
      .delete({ id, userId });
    // Deleting a spending only ADDS money back, so no balance check needed.
    return (result.affected ?? 0) > 0;
  });
}

// How much was spent in a month, per category (biggest first).
export async function getSpendingByCategory(
  userId: string,
  chapter: string,
): Promise<{ category: string; total: number }[]> {
  const repo = await getRepo("Spending");
  // SELECT category, SUM(amount) ... GROUP BY category
  const rows = await repo
    .createQueryBuilder("s")
    .select("s.category", "category")
    .addSelect("SUM(s.amount)", "total")
    .where("s.userId = :userId", { userId })
    .andWhere("s.spentOn BETWEEN :start AND :end", {
      start: chapterStart(chapter),
      end: chapterEnd(chapter),
    })
    .groupBy("s.category")
    .orderBy("total", "DESC")
    .getRawMany<{ category: string; total: string }>();
  return rows.map((r) => ({ category: r.category, total: Number(r.total) }));
}
