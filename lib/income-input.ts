// ⚠️ TEMPORARY (until Zod in Step 6). Parsers for income and settings.
import { currentChapter, isChapter, isDateString, isFutureDate } from "@/lib/dates";
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
};

export function parseIncomeInput(body: unknown): ParseResult<IncomeInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};

  const chapter = b.chapter;
  const title = readText(b.title);
  const amount = readAmount(b.amount);
  const received = b.received === true;
  const receivedOn = received ? b.receivedOn : null;

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
  });
}

// "Mark as received" only needs the day it arrived.
export function parseReceiveInput(body: unknown): ParseResult<{ receivedOn: string }> {
  const b = asObject(body);
  if (!isDateString(b.receivedOn)) {
    return { success: false, fieldErrors: { receivedOn: ["Pick the day you received it"] } };
  }
  if (isFutureDate(b.receivedOn)) {
    return { success: false, fieldErrors: { receivedOn: [FUTURE_DAY_MESSAGE] } };
  }
  return { success: true, data: { receivedOn: b.receivedOn } };
}

export type SettingsInput = { sadqaPercent: number };

export function parseSettingsInput(body: unknown): ParseResult<SettingsInput> {
  const b = asObject(body);
  const value = typeof b.sadqaPercent === "number" ? b.sadqaPercent : NaN;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return {
      success: false,
      fieldErrors: { sadqaPercent: ["Enter a number from 0 to 100"] },
    };
  }
  return { success: true, data: { sadqaPercent: roundMoney(value) } };
}
