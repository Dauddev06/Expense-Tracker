// ⚠️ TEMPORARY (until Zod in Step 6). Parsers for the Accounts page actions.
import {
  BUILTIN_ACCOUNT_IDS,
  isSavingsAccount,
  isSpendingAccount,
  type AccountId,
  type BuiltinAccountId,
} from "@/lib/accounts";
import { isDateString, isFutureDate } from "@/lib/dates";
import {
  FUTURE_DAY_MESSAGE,
  MAX_AMOUNT,
  amountError,
  asObject,
  finish,
  readAmount,
  readOptionalText,
  readText,
  type FieldErrors,
  type ParseResult,
} from "@/lib/input-helpers";

// The actions a user can do by hand on the Accounts page.
export const MONEY_ACTIONS = [
  "deposit", // Add money
  "transfer", // Move money
  "savings_borrow", // Borrow from Savings
  "savings_repay", // Repay Savings
  "sadqa_given", // Give Sadqa
] as const;
export type MoneyAction = (typeof MONEY_ACTIONS)[number];

export type MoneyActionInput = {
  type: MoneyAction;
  amount: number;
  fromAccount: AccountId | null;
  toAccount: AccountId | null;
  occurredOn: string;
  note: string | null;
};

export function isMoneyAction(value: unknown): value is MoneyAction {
  return MONEY_ACTIONS.includes(value as MoneyAction);
}

// The account if it passes the check, otherwise null.
function pickAccount(value: unknown, allowed: (v: unknown) => boolean): AccountId | null {
  return allowed(value) ? (value as AccountId) : null;
}

// Current or Pocket: where borrowed savings money goes / repayments come from
const isCurrentOrPocket = (v: unknown) => v === "current" || v === "pocket";

export function parseMoneyActionInput(
  body: unknown,
): ParseResult<MoneyActionInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};

  const type = b.type;
  const amount = readAmount(b.amount);
  const occurredOn = b.occurredOn;
  const note = readOptionalText(b.note);
  let fromAccount: AccountId | null = null;
  let toAccount: AccountId | null = null;

  if (!isMoneyAction(type)) {
    return { success: false, fieldErrors: { type: ["Unknown action"] } };
  }

  const amountProblem = amountError(amount);
  if (amountProblem) fieldErrors.amount = [amountProblem];
  if (!isDateString(occurredOn)) fieldErrors.occurredOn = ["Pick a valid date"];
  else if (isFutureDate(occurredOn)) fieldErrors.occurredOn = [FUTURE_DAY_MESSAGE];

  // Which accounts are allowed depends on the action.
  // Which accounts are allowed depends on the action. (Whether an extra
  // savings account really belongs to this user is checked in the service.)
  switch (type) {
    case "deposit":
      toAccount = pickAccount(b.toAccount, isSpendingAccount);
      if (!toAccount) fieldErrors.toAccount = ["Pick where the money goes"];
      break;
    case "transfer":
      fromAccount = pickAccount(b.fromAccount, isSpendingAccount);
      toAccount = pickAccount(b.toAccount, isSpendingAccount);
      if (!fromAccount) fieldErrors.fromAccount = ["Pick where to move from"];
      if (!toAccount) fieldErrors.toAccount = ["Pick where to move to"];
      else if (fromAccount === toAccount)
        fieldErrors.toAccount = ["Pick a different account to move to"];
      break;
    case "savings_borrow":
      // Older clients don't send it: then it's the built-in Savings
      fromAccount = b.fromAccount === undefined ? "savings" : pickAccount(b.fromAccount, isSavingsAccount);
      toAccount = pickAccount(b.toAccount, isCurrentOrPocket);
      if (!fromAccount) fieldErrors.fromAccount = ["Pick which savings account"];
      if (!toAccount) fieldErrors.toAccount = ["Pick where the money goes"];
      break;
    case "savings_repay":
      toAccount = b.toAccount === undefined ? "savings" : pickAccount(b.toAccount, isSavingsAccount);
      fromAccount = pickAccount(b.fromAccount, isCurrentOrPocket);
      if (!toAccount) fieldErrors.toAccount = ["Pick which savings account"];
      if (!fromAccount)
        fieldErrors.fromAccount = ["Pick where you are paying from"];
      break;
    case "sadqa_given":
      fromAccount = "sadqa";
      break;
  }

  return finish(fieldErrors, {
    type,
    amount,
    fromAccount,
    toAccount,
    occurredOn: occurredOn as string,
    note,
  });
}

// Starting balances: one amount per BUILT-IN account. 0 is allowed.
// (Extra savings accounts get theirs when they are opened.)
export type OpeningInput = Record<BuiltinAccountId, number>;

export function parseOpeningInput(body: unknown): ParseResult<OpeningInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  const data = {} as OpeningInput;

  for (const account of BUILTIN_ACCOUNT_IDS) {
    // Leaving an account out means "0" (the welcome flow skips Sadqa).
    const amount = b[account] === undefined ? 0 : readAmount(b[account]);
    if (!Number.isFinite(amount)) fieldErrors[account] = ["Enter an amount (0 is fine)"];
    else if (amount < 0) fieldErrors[account] = ["Can't be less than 0"];
    else if (amount > MAX_AMOUNT) fieldErrors[account] = ["That amount is too large"];
    data[account] = amount;
  }

  return finish(fieldErrors, data);
}

// Opening (or renaming) an extra savings account
export type SavingsAccountInput = { name: string; startingAmount: number };

export function parseSavingsAccountInput(body: unknown): ParseResult<SavingsAccountInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  const name = readText(b.name);
  if (name.length < 1) fieldErrors.name = ["Give it a name, e.g. Emergency fund"];
  else if (name.length > 60) fieldErrors.name = ["Keep the name under 60 characters"];

  const startingAmount =
    b.startingAmount === undefined || b.startingAmount === null ? 0 : readAmount(b.startingAmount);
  if (!Number.isFinite(startingAmount)) fieldErrors.startingAmount = ["Enter an amount (0 is fine)"];
  else if (startingAmount < 0) fieldErrors.startingAmount = ["Can't be less than 0"];
  else if (startingAmount > MAX_AMOUNT) fieldErrors.startingAmount = ["That amount is too large"];

  return finish(fieldErrors, { name, startingAmount });
}

// Editing a savings account: a new name, and (extra accounts only) a new
// starting amount. Leaving startingAmount out keeps it as it is.
export type SavingsAccountUpdate = { name: string; startingAmount: number | null };

export function parseSavingsAccountUpdate(body: unknown): ParseResult<SavingsAccountUpdate> {
  const b = asObject(body);
  const parsed = parseSavingsAccountInput(b);
  if (!parsed.success) return parsed;
  return {
    success: true,
    data: {
      name: parsed.data.name,
      startingAmount: b.startingAmount === undefined || b.startingAmount === null ? null : parsed.data.startingAmount,
    },
  };
}
