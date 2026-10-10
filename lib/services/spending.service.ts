import { Between } from "typeorm";
import { getDataSource, getRepo } from "@/lib/db/data-source";
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

    // update() is one UPDATE; save() would read the row again first
    await repo.update({ id, userId }, input);
    const saved = repo.merge(existing, input); // the row as it is now
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

// The month's spending: the total, and the biggest few (most expensive first).
// ONE query: "SUM(amount) OVER ()" adds up ALL the month's rows, even though
// only the top `limit` rows are sent back.
export async function getMonthSpending(
  userId: string,
  chapter: string,
  limit = 5,
): Promise<{ total: number; biggest: SpendingDTO[] }> {
  const ds = await getDataSource();
  const rows: (Spending & { total: string })[] = await ds.query(
    `SELECT id, title, amount, category, "spentOn"::text AS "spentOn", note, account,
            SUM(amount) OVER () AS total
       FROM spendings
      WHERE "userId" = $1 AND "spentOn" BETWEEN $2 AND $3
      ORDER BY amount DESC, "createdAt" DESC
      LIMIT $4`,
    [userId, chapterStart(chapter), chapterEnd(chapter), limit],
  );
  return {
    total: Number(rows[0]?.total ?? 0),
    // Raw queries skip the entity's money transformer, so convert here
    biggest: rows.map((r) => toSpendingDTO({ ...r, amount: Number(r.amount) })),
  };
}
