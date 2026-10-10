// ⚠️ TEMPORARY (Steps 3-5). Zod replaces this file in Step 6.
import { CATEGORY_VALUES } from "@/lib/constants";

export type SpendingInput = {
  title: string;
  amount: number;
  category: string;
  spentOn: string;
  note: string | null;
};

type ParseResult =
  | { success: true; data: SpendingInput }
  | { success: false; fieldErrors: Record<string, string[]> };

export function parseSpendingInput(body: unknown): ParseResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string[]> = {};

  const title = typeof b.title === "string" ? b.title.trim() : "";
  const amount = typeof b.amount === "number" ? b.amount : NaN;
  const category = typeof b.category === "string" ? b.category : "";
  const spentOn = typeof b.spentOn === "string" ? b.spentOn : "";
  const note =
    typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;

  if (title.length < 1) fieldErrors.title = ["Title is required"];
  if (!Number.isFinite(amount) || amount <= 0)
    fieldErrors.amount = ["Amount must be greater than 0"];
  if (!CATEGORY_VALUES.includes(category as never))
    fieldErrors.category = ["Pick a category"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn))
    fieldErrors.spentOn = ["Pick a valid date"];

  if (Object.keys(fieldErrors).length > 0)
    return { success: false, fieldErrors };
  return { success: true, data: { title, amount, category, spentOn, note } };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string) {
  return UUID_REGEX.test(value);
}
