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
