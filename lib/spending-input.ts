// ⚠️ TEMPORARY (Steps 3-5). Zod replaces this file in Step 6.
import { CATEGORY_VALUES } from "@/lib/constants";
import { isSpendingAccount, type SpendingAccount } from "@/lib/accounts";
import { FUTURE_DAY_MESSAGE, amountError, readAmount } from "@/lib/input-helpers";
import { isDateString, isFutureDate } from "@/lib/dates";

export type SpendingInput = {
  title: string;
  amount: number;
  category: string;
  spentOn: string;
  note: string | null;
  account: SpendingAccount;
};

type ParseResult =
  | { success: true; data: SpendingInput }
  | { success: false; fieldErrors: Record<string, string[]> };

export function parseSpendingInput(body: unknown): ParseResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string[]> = {};

  const title = typeof b.title === "string" ? b.title.trim() : "";
  const amount = readAmount(b.amount);
  const category = typeof b.category === "string" ? b.category : "";
  const spentOn = typeof b.spentOn === "string" ? b.spentOn : "";
  const note =
    typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
  // Older clients don't send an account: treat that as "current".
  const account = b.account === undefined ? "current" : b.account;

  if (title.length < 1) fieldErrors.title = ["Please say what it was for"];
  if (title.length > 120) fieldErrors.title = ["Keep it under 120 characters"];
  const amountProblem = amountError(amount);
  if (amountProblem) fieldErrors.amount = [amountProblem];
  if (!CATEGORY_VALUES.includes(category as never))
    fieldErrors.category = ["Pick a category"];
  if (!isDateString(spentOn))
    fieldErrors.spentOn = ["Pick a valid date"];
  else if (isFutureDate(spentOn)) fieldErrors.spentOn = [FUTURE_DAY_MESSAGE];
  if (!isSpendingAccount(account))
    fieldErrors.account = ["Pick where the money came from"];

  if (Object.keys(fieldErrors).length > 0)
    return { success: false, fieldErrors };
  return {
    success: true,
    data: {
      title,
      amount,
      category,
      spentOn,
      note,
      account: account as SpendingAccount,
    },
  };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string) {
  return UUID_REGEX.test(value);
}
