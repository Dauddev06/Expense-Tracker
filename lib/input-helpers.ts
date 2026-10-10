// ⚠️ TEMPORARY (until Zod in Step 6). Small helpers shared by the
// hand-written parsers in lib/*-input.ts.

export type FieldErrors = Record<string, string[]>;

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; fieldErrors: FieldErrors };

// numeric(12,2) can hold up to 9,999,999,999.99
export const MAX_AMOUNT = 9_999_999_999.99;

// Turns the request body into a plain object we can read safely.
export function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {};
}

export function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readOptionalText(value: unknown): string | null {
  const text = readText(value);
  return text ? text : null;
}

// Rounds to whole paisa: 10.005 -> 10.01
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// Returns the amount rounded to 2 decimals, or NaN when it isn't a number.
export function readAmount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? roundMoney(value)
    : NaN;
}

// Checks an amount that must be more than 0. Returns an error or null.
export function amountError(amount: number): string | null {
  if (!Number.isFinite(amount)) return "Enter an amount";
  if (amount <= 0) return "Amount must be more than 0";
  if (amount > MAX_AMOUNT) return "That amount is too large";
  return null;
}

// Shared error messages for dates
export const FUTURE_DAY_MESSAGE = "That day hasn't come yet. Pick today or an earlier day.";
export const FUTURE_MONTH_MESSAGE = "Pick this month or an earlier month.";

export function finish<T>(fieldErrors: FieldErrors, data: T): ParseResult<T> {
  return Object.keys(fieldErrors).length > 0
    ? { success: false, fieldErrors }
    : { success: true, data };
}
