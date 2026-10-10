import Link from "next/link";
import { IconTile, type IconName } from "@/components/icons";

// Shown instead of an empty list: a friendly line and ONE clear button.
export function EmptyState({
  icon,
  message,
  actionHref,
  actionLabel,
}: {
  icon: IconName;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-4 py-10 text-center">
      <IconTile name={icon} tone="bg-brand-soft text-brand-ink" size="lg" />
      <p className="max-w-sm text-ink-2">{message}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-primary">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
