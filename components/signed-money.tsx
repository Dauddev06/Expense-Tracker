import { formatMoney } from "@/lib/constants";

// Money in:  green, "+PKR 5,000", "Money in"
// Money out: red,   "−PKR 450",   "Money out"
// Colour is never the only signal: there is always a sign and words too.
export function SignedMoney({ amount, flow }: { amount: number; flow: "in" | "out" | "move" }) {
  const text =
    flow === "in" ? `+${formatMoney(amount)}` : flow === "out" ? `−${formatMoney(amount)}` : formatMoney(amount);
  const words = flow === "in" ? "Money in" : flow === "out" ? "Money out" : "Moved";
  const colour = flow === "in" ? "money-in" : flow === "out" ? "money-out" : "text-ink";
  return (
    <span className="flex flex-col items-end text-right">
      <span className={`font-semibold whitespace-nowrap ${colour}`}>{text}</span>
      <span className="text-xs text-muted">{words}</span>
    </span>
  );
}
