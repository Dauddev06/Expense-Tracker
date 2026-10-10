import { In, LessThan, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { getDataSource, getRepo } from "@/lib/db/data-source";
import type { PlannedExpense } from "@/lib/db/entities/PlannedExpense";
import type { Frequency, RecurringExpense } from "@/lib/db/entities/RecurringExpense";
import type { Spending } from "@/lib/db/entities/Spendings";
import type { SpendingAccount } from "@/lib/accounts";
import { chapterOf, currentChapter, dayInChapter, todayString } from "@/lib/dates";
import type {
  ExpectedInput,
  PayInput,
  PlannedEditInput,
  RecurringInput,
} from "@/lib/expected-input";
import { assertNoNegativeBalance, moneyTransaction } from "./balance.service";
import { assertOwnAccounts } from "./savings-account.service";
import { FieldError } from "./errors";

// Which days of the month each repeating expense is due on.
// Weekly is always exactly 4 per month, so every month looks the same.
const DUE_DAYS: Record<Frequency, number[]> = {
  weekly: [1, 8, 15, 22],
  biweekly: [1, 15],
  monthly: [1],
};

export type PlannedDTO = {
  id: string;
  chapter: string;
  title: string;
  amount: number;
  category: string;
  dueDate: string;
  account: SpendingAccount; // the account it will be paid from
  status: "pending" | "done";
  frequency: Frequency | null; // null = one-time
  recurringExpenseId: string | null;
  // Filled in once it is paid (from the Spending that "Mark as paid" made)
  paid: { amount: number; account: SpendingAccount; paidOn: string } | null;
};

export type RecurringDTO = {
  id: string;
  title: string;
  amount: number;
  category: string;
  account: SpendingAccount;
  frequency: Frequency;
  active: boolean;
  startChapter: string;
};

function toPlannedDTO(p: PlannedExpense): PlannedDTO {
  return {
    id: p.id,
    chapter: p.chapter,
    title: p.title,
    amount: p.amount,
    category: p.category,
    dueDate: p.dueDate,
    account: p.account,
    status: p.status === "done" ? "done" : "pending",
    frequency: p.recurringExpense?.frequency ?? null,
    recurringExpenseId: p.recurringExpenseId,
    paid: p.spending
      ? { amount: p.spending.amount, account: p.spending.account, paidOn: p.spending.spentOn }
      : null,
  };
}

function toRecurringDTO(r: RecurringExpense): RecurringDTO {
  return {
    id: r.id,
    title: r.title,
    amount: r.amount,
    category: r.category,
    account: r.account,
    frequency: r.frequency,
    active: r.active,
    startChapter: r.startChapter,
  };
}

// Creates this month's occurrences of every active repeating expense that
// has started by then. Safe to call on every page load ("idempotent"):
// the unique (recurringExpenseId, dueDate) constraint + ON CONFLICT DO
// NOTHING means rows that already exist are simply skipped.
export async function ensureChapterOccurrences(userId: string, chapter: string): Promise<void> {
  const ds = await getDataSource();
  const templates = await ds.getRepository<RecurringExpense>("RecurringExpense").find({
    // "YYYY-MM" strings sort like dates, so <= works
    where: { userId, active: true, startChapter: LessThanOrEqual(chapter) },
  });
  if (templates.length === 0) return;

  const rows = templates.flatMap((t) =>
    DUE_DAYS[t.frequency].map((day) => ({
      userId,
      chapter,
      title: t.title,
      amount: t.amount,
      category: t.category,
      account: t.account,
      dueDate: dayInChapter(chapter, day),
      status: "pending" as const,
      recurringExpenseId: t.id,
      spendingId: null,
    })),
  );
  await ds
    .createQueryBuilder()
    .insert()
    .into("PlannedExpense")
    .values(rows)
    .orIgnore() // ON CONFLICT DO NOTHING
    .execute();
}

export async function listPlanned(userId: string, chapter: string): Promise<PlannedDTO[]> {
  const repo = await getRepo("PlannedExpense");
  const rows = await repo.find({
    where: { userId, chapter, status: In(["pending", "done"]) },
    relations: { spending: true, recurringExpense: true },
    order: { dueDate: "ASC", createdAt: "ASC" },
  });
  return rows.map(toPlannedDTO);
}

export async function getPlanned(userId: string, id: string): Promise<PlannedDTO | null> {
  const repo = await getRepo("PlannedExpense");
  const row = await repo.findOne({
    where: { id, userId, status: In(["pending", "done"]) },
    relations: { spending: true, recurringExpense: true },
  });
  return row ? toPlannedDTO(row) : null;
}

// Still unpaid from months BEFORE `chapter`. A new month never hides them:
// they stay on the list until you pay or delete them.
export async function listCarriedOver(userId: string, chapter: string): Promise<PlannedDTO[]> {
  const repo = await getRepo("PlannedExpense");
  const rows = await repo.find({
    where: { userId, status: "pending", chapter: LessThan(chapter) },
    relations: { spending: true, recurringExpense: true },
    order: { dueDate: "ASC", createdAt: "ASC" },
  });
  return rows.map(toPlannedDTO);
}

// Everything still to pay up to this month (earlier months too), from one account
export async function listPendingForAccount(userId: string, account: string): Promise<PlannedDTO[]> {
  await ensureChapterOccurrences(userId, currentChapter());
  const repo = await getRepo("PlannedExpense");
  const rows = await repo.find({
    where: {
      userId,
      status: "pending",
      account: account as SpendingAccount,
      chapter: LessThanOrEqual(currentChapter()),
    },
    relations: { spending: true, recurringExpense: true },
    order: { dueDate: "ASC", createdAt: "ASC" },
  });
  return rows.map(toPlannedDTO);
}

// Adds a one-time item, or a repeating template (+ its first month).
// Returns the month to show afterwards.
export async function createExpected(userId: string, input: ExpectedInput): Promise<{ chapter: string }> {
  const ds = await getDataSource();
  await assertOwnAccounts(ds.manager, userId, [input.account]);
  const basics = {
    userId,
    title: input.title,
    amount: input.amount,
    category: input.category,
    account: input.account,
  };

  if (input.frequency === "once") {
    const repo = await getRepo("PlannedExpense");
    const chapter = chapterOf(input.dueDate!);
    await repo.save(
      repo.create({ ...basics, chapter, dueDate: input.dueDate!, status: "pending", recurringExpenseId: null }),
    );
    return { chapter };
  }

  const repo = await getRepo("RecurringExpense");
  await repo.save(
    repo.create({ ...basics, frequency: input.frequency, active: true, startChapter: input.startChapter! }),
  );
  await ensureChapterOccurrences(userId, input.startChapter!);
  return { chapter: input.startChapter! };
}

// Edit ONE occurrence (only while it is still to pay).
export async function updatePlanned(
  userId: string,
  id: string,
  input: PlannedEditInput,
): Promise<PlannedDTO | null> {
  const repo = await getRepo("PlannedExpense");
  const row = await repo.findOne({ where: { id, userId, status: In(["pending", "done"]) } });
  if (!row) return null;
  if (row.status === "done") {
    throw new FieldError(null, "This is already paid. Undo the payment first to change it.");
  }

  if (row.account !== input.account) {
    await assertOwnAccounts((await getDataSource()).manager, userId, [input.account]);
  }
  row.title = input.title;
  row.amount = input.amount;
  row.category = input.category;
  row.account = input.account;
  // A repeating occurrence keeps its day (moving it would make the
  // template create a new one on the old day). One-time items can move.
  if (!row.recurringExpenseId && input.dueDate) {
    row.dueDate = input.dueDate;
    row.chapter = chapterOf(input.dueDate);
  }
  await repo.save(row);
  return getPlanned(userId, id);
}

// Delete ONE occurrence. A repeating one is only hidden ("skipped"),
// otherwise ensureChapterOccurrences would simply create it again.
export async function deletePlanned(userId: string, id: string): Promise<boolean> {
  const repo = await getRepo("PlannedExpense");
  const row = await repo.findOne({ where: { id, userId, status: In(["pending", "done"]) } });
  if (!row) return false;
  if (row.status === "done") {
    throw new FieldError(null, "This is already paid. Undo the payment first, then delete it.");
  }
  if (row.recurringExpenseId) await repo.update({ id, userId }, { status: "skipped" });
  else await repo.delete({ id, userId });
  return true;
}

// "Mark as paid": creates a normal Spending and links it, in one transaction.
export async function markPlannedPaid(
  userId: string,
  id: string,
  input: PayInput,
): Promise<PlannedDTO | null> {
  const done = await moneyTransaction(userId, async (m) => {
    const plannedRepo = m.getRepository<PlannedExpense>("PlannedExpense");
    const row = await plannedRepo.findOne({ where: { id, userId, status: In(["pending", "done"]) } });
    if (!row) return false;
    if (row.status === "done") throw new FieldError(null, "This is already marked as paid.");
    await assertOwnAccounts(m, userId, [input.account]);

    const spendingRepo = m.getRepository<Spending>("Spending");
    const spending = await spendingRepo.save(
      spendingRepo.create({
        userId,
        title: row.title,
        amount: input.amount,
        category: row.category,
        spentOn: input.paidOn,
        account: input.account,
        note: null,
      }),
    );
    row.status = "done";
    row.spendingId = spending.id;
    await plannedRepo.save(row);

    await assertNoNegativeBalance(m, userId, [
      { account: input.account, field: "amount", requested: input.amount },
    ]);
    return true;
  });
  return done ? getPlanned(userId, id) : null;
}

// "Undo": deletes that Spending (money goes back) and makes it "to pay" again.
export async function undoPlannedPaid(userId: string, id: string): Promise<PlannedDTO | null> {
  const found = await moneyTransaction(userId, async (m) => {
    const plannedRepo = m.getRepository<PlannedExpense>("PlannedExpense");
    const row = await plannedRepo.findOne({ where: { id, userId, status: In(["pending", "done"]) } });
    if (!row) return false;
    if (row.status !== "done") return true;

    const spendingId = row.spendingId;
    row.status = "pending";
    row.spendingId = null;
    await plannedRepo.save(row);
    if (spendingId) {
      await m.getRepository<Spending>("Spending").delete({ id: spendingId, userId });
    }
    return true;
  });
  return found ? getPlanned(userId, id) : null;
}

// ---------- Repeating templates ----------

export async function listRecurring(userId: string): Promise<RecurringDTO[]> {
  const repo = await getRepo("RecurringExpense");
  const rows = await repo.find({ where: { userId }, order: { createdAt: "ASC" } });
  return rows.map(toRecurringDTO);
}

export async function getRecurring(userId: string, id: string): Promise<RecurringDTO | null> {
  const repo = await getRepo("RecurringExpense");
  const row = await repo.findOne({ where: { id, userId } });
  return row ? toRecurringDTO(row) : null;
}

// Edit / pause / resume a template. Changes apply from TODAY on:
// past and paid occurrences are never touched.
export async function updateRecurring(
  userId: string,
  id: string,
  input: RecurringInput,
): Promise<RecurringDTO | null> {
  const ds = await getDataSource();
  const today = todayString();

  const saved = await ds.transaction(async (m) => {
    const repo = m.getRepository<RecurringExpense>("RecurringExpense");
    const plannedRepo = m.getRepository<PlannedExpense>("PlannedExpense");
    const template = await repo.findOne({ where: { id, userId } });
    if (!template) return null;
    if (template.account !== input.account) await assertOwnAccounts(m, userId, [input.account]);

    const frequencyChanged = template.frequency !== input.frequency;
    repo.merge(template, input);
    await repo.save(template);

    const future = { recurringExpenseId: id, userId, dueDate: MoreThanOrEqual(today) };
    if (frequencyChanged || !input.active) {
      // Remove future occurrences; they are re-created with the new
      // schedule (or not at all while paused).
      await plannedRepo.delete({ ...future, status: In(["pending", "skipped"]) });
    } else {
      await plannedRepo.update(
        { ...future, status: "pending" },
        { title: input.title, amount: input.amount, category: input.category, account: input.account },
      );
    }
    return toRecurringDTO(template);
  });

  if (saved?.active) await ensureChapterOccurrences(userId, currentChapter());
  return saved;
}

// Deletes a template and its FUTURE unpaid occurrences. Past and paid ones
// stay (they become one-time items because recurringExpenseId is SET NULL).
export async function deleteRecurring(userId: string, id: string): Promise<boolean> {
  const ds = await getDataSource();
  return ds.transaction(async (m) => {
    const repo = m.getRepository<RecurringExpense>("RecurringExpense");
    const template = await repo.findOne({ where: { id, userId } });
    if (!template) return false;

    await m.getRepository<PlannedExpense>("PlannedExpense").delete({
      recurringExpenseId: id,
      userId,
      status: In(["pending", "skipped"]),
      dueDate: MoreThanOrEqual(todayString()),
    });
    await repo.delete({ id, userId });
    return true;
  });
}

// For the dashboard: this month's expected expenses in three numbers.
export function summarizePlanned(items: PlannedDTO[]) {
  const paid = items.reduce((sum, p) => sum + (p.paid?.amount ?? 0), 0);
  const stillToPay = items
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);
  return { total: paid + stillToPay, paid, stillToPay };
}
