import type { IconName } from "@/components/icons";

// Each category has an icon and a colour (tile = icon tile, bar = chart bar).
// The colours are see-through tints, so they work in light AND dark mode.
export const CATEGORIES = [
  { value: "food", label: "Food", icon: "utensils", tile: "bg-orange-500/12 text-orange-600", bar: "bg-orange-500" },
  { value: "transport", label: "Transport", icon: "bus", tile: "bg-sky-500/12 text-sky-600", bar: "bg-sky-500" },
  { value: "shopping", label: "Shopping", icon: "bag", tile: "bg-fuchsia-500/12 text-fuchsia-600", bar: "bg-fuchsia-500" },
  { value: "bills", label: "Bills", icon: "receipt", tile: "bg-violet-500/12 text-violet-600", bar: "bg-violet-500" },
  { value: "entertainment", label: "Fun", icon: "film", tile: "bg-yellow-500/15 text-yellow-600", bar: "bg-yellow-500" },
  { value: "health", label: "Health", icon: "pulse", tile: "bg-teal-500/12 text-teal-600", bar: "bg-teal-500" },
  { value: "other", label: "Other", icon: "box", tile: "bg-tile text-ink-2", bar: "bg-faint" },
] as const satisfies readonly { value: string; label: string; icon: IconName; tile: string; bar: string }[];

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

export function getCategory(value: string) {
  return (
    CATEGORIES.find((c) => c.value === value) ??
    CATEGORIES[CATEGORIES.length - 1]
  );
}

// Change this to your own currency, e.g. "USD", "INR", "EUR"
export const CURRENCY = "PKR";

// formatMoney(2300)   -> "PKR 2,300"
// formatMoney(450.5)  -> "PKR 450.50"   (decimals only when there are some)
export function formatMoney(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: CURRENCY,
    currencyDisplay: "code", // "PKR 2,300" instead of "Rs 2,300"
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(rounded)
    .replace(/\u00a0/g, " "); // Intl puts a non-breaking space after "PKR"
}

// "YYYY-MM-DD" for a date in the user's LOCAL timezone.
// (toISOString() would use UTC and can give you yesterday/tomorrow!)
export function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
