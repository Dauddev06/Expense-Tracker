// ⚠️ TEMPORARY (until Zod in Step 6). Parsers for income and settings.
import { currentChapter, isChapter, isDateString, isFutureDate } from "@/lib/dates";
import { isSavingsAccount } from "@/lib/accounts";
import {
  FUTURE_DAY_MESSAGE,
  FUTURE_MONTH_MESSAGE,
  amountError,
  asObject,
  finish,
  readAmount,
  readText,
  roundMoney,
  type FieldErrors,
  type ParseResult,
} from "@/lib/input-helpers";

export type IncomeInput = {
  chapter: string; // "YYYY-MM"
  title: string;
  amount: number;
  received: boolean;
  receivedOn: string | null; // required when received = true
  savings: SavingsChoice | null; // null = use the Settings
};

// How much of an income to save, and into which savings account
export type SavingsChoice = { percent: number; account: string };

// Reads the optional { savingsPercent, savingsAccount } pair.
// Not sent at all -> null (the service then uses the user's Settings).
function readSavingsChoice(b: Record<string, unknown>, fieldErrors: FieldErrors): SavingsChoice | null {
  if (b.savingsPercent === undefined && b.savingsAccount === undefined) return null;
  const percent = typeof b.savingsPercent === "number" ? b.savingsPercent : NaN;
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    fieldErrors.savingsPercent = ["Enter a number from 0 to 100"];
  }
  if (!isSavingsAccount(b.savingsAccount)) {
    fieldErrors.savingsAccount = ["Pick a savings account"];
  }
  return { percent: roundMoney(percent), account: b.savingsAccount as string };
}

export function parseIncomeInput(body: unknown): ParseResult<IncomeInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};

  const chapter = b.chapter;
  const title = readText(b.title);
  const amount = readAmount(b.amount);
  const received = b.received === true;
  const receivedOn = received ? b.receivedOn : null;
  const savings = readSavingsChoice(b, fieldErrors);

  if (!isChapter(chapter)) fieldErrors.chapter = ["Pick a month"];
  else if (chapter > currentChapter()) fieldErrors.chapter = [FUTURE_MONTH_MESSAGE];
  if (title.length < 1) fieldErrors.title = ["Give it a name, like Salary"];
  if (title.length > 120) fieldErrors.title = ["Keep it under 120 characters"];
  const amountProblem = amountError(amount);
  if (amountProblem) fieldErrors.amount = [amountProblem];
  if (received && !isDateString(receivedOn))
    fieldErrors.receivedOn = ["Pick the day you received it"];
  else if (received && isFutureDate(receivedOn as string))
    fieldErrors.receivedOn = [FUTURE_DAY_MESSAGE];

  return finish(fieldErrors, {
    chapter: chapter as string,
    title,
    amount,
    received,
    receivedOn: received ? (receivedOn as string) : null,
    savings,
  });
}

// "Mark as received": the day it arrived, and (optionally) how much of it
// to save into which savings account.
export type ReceiveInput = { receivedOn: string; savings: SavingsChoice | null };

export function parseReceiveInput(body: unknown): ParseResult<ReceiveInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  if (!isDateString(b.receivedOn)) fieldErrors.receivedOn = ["Pick the day you received it"];
  else if (isFutureDate(b.receivedOn)) fieldErrors.receivedOn = [FUTURE_DAY_MESSAGE];
  const savings = readSavingsChoice(b, fieldErrors);
  return finish(fieldErrors, { receivedOn: b.receivedOn as string, savings });
}

// Settings can be saved in parts: the Sadqa % on its own (welcome flow,
// Settings), or the savings % + account on their own.
export type SettingsInput = {
  sadqaPercent?: number;
  savingsPercent?: number;
  savingsAccount?: string;
};

function readPercent(value: unknown, field: string, fieldErrors: FieldErrors): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    fieldErrors[field] = ["Enter a number from 0 to 100"];
    return undefined;
  }
  return roundMoney(n);
}

export function parseSettingsInput(body: unknown): ParseResult<SettingsInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  const data: SettingsInput = {
    sadqaPercent: readPercent(b.sadqaPercent, "sadqaPercent", fieldErrors),
    savingsPercent: readPercent(b.savingsPercent, "savingsPercent", fieldErrors),
  };
  if (b.savingsAccount !== undefined) {
    if (isSavingsAccount(b.savingsAccount)) data.savingsAccount = b.savingsAccount;
    else fieldErrors.savingsAccount = ["Pick a savings account"];
  }
  if (Object.values(data).every((v) => v === undefined) && Object.keys(fieldErrors).length === 0) {
    fieldErrors.sadqaPercent = ["Nothing to save"];
  }
  return finish(fieldErrors, data);
}
