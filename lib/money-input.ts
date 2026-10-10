// ⚠️ TEMPORARY (until Zod in Step 6). Parsers for the Accounts page actions.
import {
  ACCOUNT_IDS,
  type AccountId,
  type Balances,
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

// Returns the account if it is one of the allowed ones, otherwise null.
function pickAccount(
  value: unknown,
  allowed: readonly AccountId[],
): AccountId | null {
  return allowed.includes(value as AccountId) ? (value as AccountId) : null;
}

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
  switch (type) {
    case "deposit":
      toAccount = pickAccount(b.toAccount, ["current", "savings", "pocket"]);
      if (!toAccount) fieldErrors.toAccount = ["Pick where the money goes"];
      break;
    case "transfer":
      fromAccount = pickAccount(b.fromAccount, ["current", "savings", "pocket"]);
      toAccount = pickAccount(b.toAccount, ["current", "savings", "pocket"]);
      if (!fromAccount) fieldErrors.fromAccount = ["Pick where to move from"];
      if (!toAccount) fieldErrors.toAccount = ["Pick where to move to"];
      else if (fromAccount === toAccount)
        fieldErrors.toAccount = ["Pick a different account to move to"];
      break;
    case "savings_borrow":
      fromAccount = "savings";
      toAccount = pickAccount(b.toAccount, ["current", "pocket"]);
      if (!toAccount) fieldErrors.toAccount = ["Pick where the money goes"];
      break;
    case "savings_repay":
      toAccount = "savings";
      fromAccount = pickAccount(b.fromAccount, ["current", "pocket"]);
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

// Starting balances: one amount per account. 0 is allowed.
export type OpeningInput = Balances;

export function parseOpeningInput(body: unknown): ParseResult<OpeningInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  const data = {} as OpeningInput;

  for (const account of ACCOUNT_IDS) {
    // Leaving an account out means "0" (the welcome flow skips Sadqa).
    const amount = b[account] === undefined ? 0 : readAmount(b[account]);
    if (!Number.isFinite(amount)) fieldErrors[account] = ["Enter an amount (0 is fine)"];
    else if (amount < 0) fieldErrors[account] = ["Can't be less than 0"];
    else if (amount > MAX_AMOUNT) fieldErrors[account] = ["That amount is too large"];
    data[account] = amount;
  }

  return finish(fieldErrors, data);
}
