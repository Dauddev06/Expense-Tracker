import type { IconName } from "@/components/icons";
import { IconTile } from "@/components/icons";

// A small card with a label and a big number, e.g. "Received  PKR 100,000".
// tone colours the number (money in / out); the label always says what it is.
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  iconTone,
  compact = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "in" | "out";
  icon?: IconName;
  iconTone?: string;
  compact?: boolean; // for 3 cards side by side on a phone
}) {
  const colour = tone === "in" ? "money-in" : tone === "out" ? "money-out" : "text-ink";
  return (
    <div className={`card ${compact ? "px-3 py-4 sm:p-6" : ""}`}>
      <div className="flex items-center gap-2">
        {icon && <IconTile name={icon} tone={iconTone} size="sm" />}
        <p className="stat-label">{label}</p>
      </div>
      <p
        className={`mt-2 font-semibold tracking-tight whitespace-nowrap tabular-nums ${colour} ${
          compact ? "text-base sm:text-2xl" : "text-xl sm:text-2xl"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}
