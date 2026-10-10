export const CATEGORIES = [
  { value: "food", label: "Food", emoji: "🍔" },
  { value: "transport", label: "Transport", emoji: "🚌" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
  { value: "bills", label: "Bills", emoji: "🧾" },
  { value: "entertainment", label: "Fun", emoji: "🎬" },
  { value: "health", label: "Health", emoji: "💊" },
  { value: "other", label: "Other", emoji: "📦" },
] as const;

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

export function getCategory(value: string) {
  return (
    CATEGORIES.find((c) => c.value === value) ??
    CATEGORIES[CATEGORIES.length - 1]
  );
}

// Change this to your own currency, e.g. "USD", "INR", "EUR"
export const CURRENCY = "PKR";

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: CURRENCY,
  }).format(amount);
}

// "YYYY-MM-DD" for a date in the user's LOCAL timezone.
// (toISOString() would use UTC and can give you yesterday/tomorrow!)
export function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
