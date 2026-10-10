"use client";

import { accountLabel, balanceOf, type AccountId, type Balances } from "@/lib/accounts";
import { useAccounts } from "@/components/accounts-context";
import { formatMoney } from "@/lib/constants";

export type BalanceChange = { account: AccountId; delta: number };

// One line per account showing what saving will do, before you save:
//   Current: PKR 47,500 → PKR 37,500
export function EffectPreview({
  balances,
  changes,
}: {
  balances: Balances;
  changes: BalanceChange[];
}) {
  const accounts = useAccounts();
  // Add up changes to the same account, and ignore empty/invalid amounts
  const totals = new Map<AccountId, number>();
  for (const { account, delta } of changes) {
    if (!Number.isFinite(delta) || delta === 0) continue;
    totals.set(account, (totals.get(account) ?? 0) + delta);
  }
  if (totals.size === 0) return null;

  return (
    <div aria-live="polite" className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
      <p className="font-medium text-ink-2">After saving:</p>
      <ul className="mt-1 space-y-1">
        {[...totals].map(([account, delta]) => {
          const before = balanceOf(balances, account);
          const after = Math.round((before + delta) * 100) / 100;
          return (
            <li key={account}>
              {accountLabel(account, accounts)}: {formatMoney(before)} →{" "}
              <strong className={after < 0 ? "text-negative" : "text-ink"}>
                {formatMoney(after)}
              </strong>
              {after < 0 && <span className="text-negative"> (not enough money)</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
