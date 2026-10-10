import Link from "next/link";
import type { AccountInfo } from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { Icon, IconTile } from "@/components/icons";

export type AccountCard = {
  info: AccountInfo;
  balance: number; // now, or at the end of a past month
  // Optional: what it started the month with ("carried over" from last month)
  opening?: { amount: number; month: string };
};

// One card per account. Tapping a card opens that account's own page.
export function BalanceCards({ cards, chapter }: { cards: AccountCard[]; chapter?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map(({ info, balance, opening }) => (
        <Link
          key={info.value}
          href={`/accounts/${info.value}${chapter ? `?chapter=${chapter}` : ""}`}
          className="card group flex flex-col gap-3 p-4 transition hover:ring-brand/40 active:scale-[0.99] sm:p-5"
        >
          <span className="flex items-center gap-2">
            <IconTile name={info.icon} tone={info.tone} size="sm" />
            <span className="stat-label min-w-0 flex-1 truncate">{info.label}</span>
            <Icon name="chevron-right" className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5" />
          </span>
          <span className="amount text-xl text-ink sm:text-2xl">{formatMoney(balance)}</span>
          {opening && (
            <span className="-mt-2 text-xs text-muted">
              Started {opening.month} with {formatMoney(opening.amount)}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
