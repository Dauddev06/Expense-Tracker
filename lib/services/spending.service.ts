import { getRepo } from "@/lib/db/data-source";
import type { Spending } from "@/lib/db/entities/Spendings";
import type { SpendingInput } from "@/lib/spending-input";
import { toDateInputValue } from "@/lib/constants";

// What we send to the browser. Plain data only (no class instances, no Dates)
export type SpendingDTO = {
  id: string;
  title: string;
  amount: number;
  category: string;
  spentOn: string;
  note: string | null;
};

function toDTO(s: Spending): SpendingDTO {
  return {
    id: s.id,
    title: s.title,
    amount: s.amount,
    category: s.category,
    spentOn: s.spentOn,
    note: s.note,
  };
}

// EVERY query filters by userId. That is what stops user A from
// reading/editing/deleting user B's spendings.

export async function listSpendings(
  userId: string,
  limit?: number,
): Promise<SpendingDTO[]> {
  const repo = await getRepo("Spending");
  const rows = await repo.find({
    where: { userId },
    order: { spentOn: "DESC", createdAt: "DESC" },
    take: limit,
  });
  return rows.map(toDTO);
}

export async function createSpending(
  userId: string,
  input: SpendingInput,
): Promise<SpendingDTO> {
  const repo = await getRepo("Spending");
  const saved = await repo.save(repo.create({ ...input, userId }));
  return toDTO(saved);
}

export async function getSummary(userId: string) {
  const repo = await getRepo("Spending");
  const now = new Date();
  const today = toDateInputValue(now);
  const monthStart = toDateInputValue(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );

  // QueryBuilder = writing SQL with TypeScript. Generates roughly:
  // SELECT SUM(CASE ...) ... FROM spendings s WHERE s."userId" = $1
  const raw = await repo
    .createQueryBuilder("s")
    .select(
      "COALESCE(SUM(CASE WHEN s.spentOn = :today THEN s.amount ELSE 0 END), 0)",
      "today",
    )
    .addSelect(
      "COALESCE(SUM(CASE WHEN s.spentOn >= :monthStart THEN s.amount ELSE 0 END), 0)",
      "month",
    )
    .addSelect("COUNT(*)", "count")
    .where("s.userId = :userId", { userId })
    .setParameters({ today, monthStart })
    .getRawOne<{ today: string; month: string; count: string }>();

  return {
    today: Number(raw?.today ?? 0),
    month: Number(raw?.month ?? 0),
    count: Number(raw?.count ?? 0),
  };
}
export async function getSpending(
  userId: string,
  id: string,
): Promise<SpendingDTO | null> {
  const repo = await getRepo("Spending");
  const row = await repo.findOne({ where: { id, userId } });
  return row ? toDTO(row) : null;
}

export async function updateSpending(
  userId: string,
  id: string,
  input: SpendingInput,
): Promise<SpendingDTO | null> {
  const repo = await getRepo("Spending");
  const existing = await repo.findOne({ where: { id, userId } });
  if (!existing) return null;

  repo.merge(existing, input); // copy the new values onto the loaded entity
  const saved = await repo.save(existing);
  return toDTO(saved);
}

export async function deleteSpending(
  userId: string,
  id: string,
): Promise<boolean> {
  const repo = await getRepo("Spending");
  const result = await repo.delete({ id, userId });
  return (result.affected ?? 0) > 0;
}
