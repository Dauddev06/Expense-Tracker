import type { IconName } from "@/components/icons";

// The four "pots" of money every user has. This is a plain list (not a
// database table) because every user always has exactly these four.
// `icon` + `tone` (tile colours) give each account its own look in the UI.
export const ACCOUNTS = [
  {
    value: "current",
    label: "Current",
    icon: "bank",
    tone: "bg-brand-soft text-brand-ink",
    description: "Your main bank account. Income arrives here.",
  },
  {
    value: "savings",
    label: "Savings",
    icon: "piggy",
    tone: "bg-positive-soft text-positive",
    description: "Money you're putting away. Borrow from it and pay it back.",
  },
  {
    value: "pocket",
    label: "Pocket",
    icon: "wallet",
    tone: "bg-warning-soft text-warning",
    description: "The cash in your wallet.",
  },
  {
    value: "sadqa",
    label: "Sadqa",
    icon: "heart",
    tone: "bg-sadqa-soft text-sadqa",
    description: "Set aside from every income, ready to give.",
  },
] as const satisfies readonly {
  value: string;
  label: string;
  icon: IconName;
  tone: string;
  description: string;
}[];

export type AccountId = (typeof ACCOUNTS)[number]["value"];
export const ACCOUNT_IDS: AccountId[] = ACCOUNTS.map((a) => a.value);

// Sadqa money can only be GIVEN, so you can't spend or move money with it.
export const SPENDING_ACCOUNTS = ["current", "savings", "pocket"] as const;
export type SpendingAccount = (typeof SPENDING_ACCOUNTS)[number];

// How much is in each account, e.g. { current: 47500, savings: 90000, ... }
export type Balances = Record<AccountId, number>;

export const EMPTY_BALANCES: Balances = {
  current: 0,
  savings: 0,
  pocket: 0,
  sadqa: 0,
};

export function getAccount(value: string) {
  return ACCOUNTS.find((a) => a.value === value) ?? ACCOUNTS[0];
}

export function accountLabel(value: string) {
  return getAccount(value).label;
}

export function isAccount(value: unknown): value is AccountId {
  return ACCOUNT_IDS.includes(value as AccountId);
}

export function isSpendingAccount(value: unknown): value is SpendingAccount {
  return SPENDING_ACCOUNTS.includes(value as SpendingAccount);
}

// Every kind of money movement we record (stored in ledger_entries.type).
// These names are for the code only - the UI always shows plain sentences.
export const LEDGER_TYPES = [
  "opening", // starting balance of an account
  "deposit", // "Add money"
  "transfer", // "Move money"
  "savings_borrow", // borrowed from Savings
  "savings_repay", // paid Savings back
  "income", // income received into Current
  "sadqa_allocation", // part of income set aside: Current -> Sadqa
  "sadqa_given", // Sadqa given away
  "loan_given", // I lent money to someone
  "loan_taken", // I borrowed money from someone
  "loan_payment_in", // someone paid me back
  "loan_payment_out", // I paid someone back
] as const;

export type LedgerType = (typeof LEDGER_TYPES)[number];
