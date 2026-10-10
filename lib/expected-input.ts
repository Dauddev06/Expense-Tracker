// ⚠️ TEMPORARY (until Zod in Step 6). Parsers for expected (planned) expenses.
import { isSpendingAccount, type SpendingAccount } from "@/lib/accounts";
import { chapterOf, currentChapter, isChapter, isDateString, isFutureDate } from "@/lib/dates";
import type { Frequency } from "@/lib/db/entities/RecurringExpense";
import {
  FUTURE_DAY_MESSAGE,
  FUTURE_MONTH_MESSAGE,
  amountError,
  asObject,
  finish,
  readAmount,
  readText,
  type FieldErrors,
  type ParseResult,
} from "@/lib/input-helpers";

const DUE_MONTH_MESSAGE = "Pick a day in this month or an earlier month.";

// "once" = a one-time item; the others create a repeating template
export const FREQUENCY_OPTIONS = [
  { value: "once", label: "One time" },
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every month" },
] as const;
export type FrequencyChoice = (typeof FREQUENCY_OPTIONS)[number]["value"];

export function frequencyLabel(value: string): string {
  return FREQUENCY_OPTIONS.find((f) => f.value === value)?.label ?? "One time";
}

function isFrequency(value: unknown): value is Frequency {
  return value === "weekly" || value === "biweekly" || value === "monthly";
}

// Shared checks for title / amount / pay-from account
function readBasics(b: Record<string, unknown>, fieldErrors: FieldErrors) {
  const title = readText(b.title);
  const amount = readAmount(b.amount);
  // Older clients don't send an account: treat that as "current".
  const account = (b.account === undefined ? "current" : b.account) as SpendingAccount;
  if (!isSpendingAccount(account)) fieldErrors.account = ["Pick which account you'll pay from"];

  if (title.length < 1) fieldErrors.title = ["Please say what it is for"];
  if (title.length > 120) fieldErrors.title = ["Keep it under 120 characters"];
  const amountProblem = amountError(amount);
  if (amountProblem) fieldErrors.amount = [amountProblem];
  // Categories were removed from the app; the database column gets "other"
  return { title, amount, category: "other", account };
}

export type ExpectedInput = {
  title: string;
  amount: number;
  category: string;
  account: SpendingAccount;
  frequency: FrequencyChoice;
  dueDate: string | null; // one-time items only
  startChapter: string | null; // repeating items only: first month
};

export function parseExpectedInput(body: unknown): ParseResult<ExpectedInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  const basics = readBasics(b, fieldErrors);
  const frequency = b.frequency;

  let dueDate: string | null = null;
  let startChapter: string | null = null;
  if (frequency === "once") {
    if (!isDateString(b.dueDate)) fieldErrors.dueDate = ["Pick the day it is due"];
    else if (chapterOf(b.dueDate) > currentChapter()) fieldErrors.dueDate = [DUE_MONTH_MESSAGE];
    else dueDate = b.dueDate;
  } else if (isFrequency(frequency)) {
    if (!isChapter(b.startChapter)) fieldErrors.startChapter = ["Pick the first month"];
    else if (b.startChapter > currentChapter()) fieldErrors.startChapter = [FUTURE_MONTH_MESSAGE];
    else startChapter = b.startChapter;
  } else {
    fieldErrors.frequency = ["Pick how often"];
  }

  return finish(fieldErrors, {
    ...basics,
    frequency: frequency as FrequencyChoice,
    dueDate,
    startChapter,
  });
}

// Editing ONE occurrence. dueDate is only used for one-time items.
export type PlannedEditInput = {
  title: string;
  amount: number;
  category: string;
  account: SpendingAccount;
  dueDate: string | null;
};

export function parsePlannedEditInput(body: unknown): ParseResult<PlannedEditInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  const basics = readBasics(b, fieldErrors);
  let dueDate: string | null = null;
  if (b.dueDate !== undefined && b.dueDate !== null) {
    if (!isDateString(b.dueDate)) fieldErrors.dueDate = ["Pick a valid date"];
    else if (chapterOf(b.dueDate) > currentChapter()) fieldErrors.dueDate = [DUE_MONTH_MESSAGE];
    else dueDate = b.dueDate;
  }
  return finish(fieldErrors, { ...basics, dueDate });
}

// "Mark as paid": what it really cost, from which account, and when.
export type PayInput = { amount: number; account: SpendingAccount; paidOn: string };

export function parsePayInput(body: unknown): ParseResult<PayInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  const amount = readAmount(b.amount);
  const amountProblem = amountError(amount);
  if (amountProblem) fieldErrors.amount = [amountProblem];
  if (!isSpendingAccount(b.account)) fieldErrors.account = ["Pick where the money came from"];
  if (!isDateString(b.paidOn)) fieldErrors.paidOn = ["Pick the day you paid"];
  else if (isFutureDate(b.paidOn)) fieldErrors.paidOn = [FUTURE_DAY_MESSAGE];
  return finish(fieldErrors, {
    amount,
    account: b.account as SpendingAccount,
    paidOn: b.paidOn as string,
  });
}

// Editing a repeating template (also used to pause / resume it)
export type RecurringInput = {
  title: string;
  amount: number;
  category: string;
  account: SpendingAccount;
  frequency: Frequency;
  active: boolean;
};

export function parseRecurringInput(body: unknown): ParseResult<RecurringInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  const basics = readBasics(b, fieldErrors);
  if (!isFrequency(b.frequency)) fieldErrors.frequency = ["Pick how often"];
  if (typeof b.active !== "boolean") fieldErrors.active = ["Choose on or paused"];
  return finish(fieldErrors, {
    ...basics,
    frequency: b.frequency as Frequency,
    active: b.active === true,
  });
}
