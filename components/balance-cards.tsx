import Link from "next/link";
import { ACCOUNTS, type Balances } from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { Icon, IconTile } from "@/components/icons";

// One card per account. Tapping a card opens that account's own page.
export function BalanceCards({ balances }: { balances: Balances }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACCOUNTS.map((account) => (
        <Link
          key={account.value}
          href={`/accounts/${account.value}`}
          className="card group flex flex-col gap-3 p-4 transition hover:ring-brand/40 active:scale-[0.99] sm:p-5"
        >
          <span className="flex items-center gap-2">
            <IconTile name={account.icon} tone={account.tone} size="sm" />
            <span className="stat-label flex-1">{account.label}</span>
            <Icon name="chevron-right" className="size-4 text-faint transition group-hover:translate-x-0.5" />
          </span>
          <span className="amount text-lg text-ink sm:text-xl">{formatMoney(balances[account.value])}</span>
        </Link>
      ))}
    </div>
  );
}
