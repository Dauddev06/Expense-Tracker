"use client";

import { balanceOf, getAccount, type AccountId, type Balances } from "@/lib/accounts";
import { useAccounts } from "@/components/accounts-context";
import { formatMoney } from "@/lib/constants";
import { Icon } from "@/components/icons";

// 5 or more accounts (extra savings) wrap onto more rows
const COLUMNS = ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-2 sm:grid-cols-4", "grid-cols-2 sm:grid-cols-3"];

type Props = {
  label: string;
  value: string;
  onChange: (account: AccountId) => void;
  onBlur?: () => void;
  options: readonly AccountId[];
  balances?: Balances; // shows "PKR 47,500" under each account
  error?: string;
};

// Big tappable account buttons. Use it inside RHF's <Controller>.
export function AccountPicker({ label, value, onChange, onBlur, options, balances, error }: Props) {
  const accounts = useAccounts();
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className={`grid gap-2 ${COLUMNS[Math.min(options.length, COLUMNS.length) - 1]}`}>
        {options.map((option) => {
          const account = getAccount(option, accounts);
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              onBlur={onBlur}
              className={`chip flex-col gap-1 px-1 py-2.5 ${selected ? "chip-selected" : ""}`}
            >
              <span className="flex max-w-full items-center gap-1.5 truncate whitespace-nowrap">
                <Icon name={account.icon} className="size-4" />
                {account.label}
              </span>
              {balances && (
                <span
                  className={`text-xs whitespace-nowrap tabular-nums ${
                    selected ? "text-on-brand/80" : "text-muted"
                  }`}
                >
                  {formatMoney(balanceOf(balances, option))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="error-text">{error}</p>}
    </fieldset>
  );
}
