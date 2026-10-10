// ⚠️ TEMPORARY (until Zod in Step 6). Parsers for loans and loan payments.
import { isSpendingAccount, type SpendingAccount } from "@/lib/accounts";
import { isDateString, isFutureDate } from "@/lib/dates";
import type { LoanDirection } from "@/lib/db/entities/Loan";
import {
  FUTURE_DAY_MESSAGE,
  amountError,
  asObject,
  finish,
  readAmount,
  readOptionalText,
  readText,
  type FieldErrors,
  type ParseResult,
} from "@/lib/input-helpers";

export type LoanInput = {
  personName: string;
  direction: LoanDirection;
  amount: number;
  account: SpendingAccount;
  startedOn: string;
  note: string | null;
};

// Used for creating AND editing. (When editing, the service keeps the
// original direction, and only lets the amount change while there are no payments.)
export function parseLoanInput(body: unknown): ParseResult<LoanInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};

  const personName = readText(b.personName);
  const amount = readAmount(b.amount);
  if (personName.length < 1) fieldErrors.personName = ["Who is it? Enter a name"];
  if (personName.length > 100) fieldErrors.personName = ["Keep the name under 100 characters"];
  if (b.direction !== "given" && b.direction !== "taken")
    fieldErrors.direction = ["Did you lend or borrow?"];
  const amountProblem = amountError(amount);
  if (amountProblem) fieldErrors.amount = [amountProblem];
  if (!isSpendingAccount(b.account)) fieldErrors.account = ["Pick an account"];
  if (!isDateString(b.startedOn)) fieldErrors.startedOn = ["Pick a valid date"];
  else if (isFutureDate(b.startedOn)) fieldErrors.startedOn = [FUTURE_DAY_MESSAGE];

  return finish(fieldErrors, {
    personName,
    direction: b.direction as LoanDirection,
    amount,
    account: b.account as SpendingAccount,
    startedOn: b.startedOn as string,
    note: readOptionalText(b.note),
  });
}

export type LoanPaymentInput = {
  amount: number;
  account: SpendingAccount;
  paidOn: string;
  note: string | null;
};

export function parseLoanPaymentInput(body: unknown): ParseResult<LoanPaymentInput> {
  const b = asObject(body);
  const fieldErrors: FieldErrors = {};
  const amount = readAmount(b.amount);
  const amountProblem = amountError(amount);
  if (amountProblem) fieldErrors.amount = [amountProblem];
  if (!isSpendingAccount(b.account)) fieldErrors.account = ["Pick an account"];
  if (!isDateString(b.paidOn)) fieldErrors.paidOn = ["Pick a valid date"];
  else if (isFutureDate(b.paidOn)) fieldErrors.paidOn = [FUTURE_DAY_MESSAGE];

  return finish(fieldErrors, {
    amount,
    account: b.account as SpendingAccount,
    paidOn: b.paidOn as string,
    note: readOptionalText(b.note),
  });
}
