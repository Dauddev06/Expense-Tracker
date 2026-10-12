import type { IconName } from "@/components/icons";

// The four built-in accounts every user has. On top of these a user can open
// MORE savings accounts (e.g. "Emergency fund", "Hajj"). Those live in the
// savings_accounts table and have keys like "sv_k3j9x2ab".
// Sadqa is the odd one out: it holds no money, it only REMINDS you how much
// Sadqa you still have to give. Giving it takes the money out of a real account.
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
    label: "Sadqa to give",
    icon: "heart",
    tone: "bg-sadqa-soft text-sadqa",
    description: "A reminder, not money: part of every income is added here. When you give it, pick the account it comes out of.",
  },
] as const satisfies readonly {
  value: string;
  label: string;
  icon: IconName;
  tone: string;
  description: string;
}[];

export type BuiltinAccountId = (typeof ACCOUNTS)[number]["value"];
export const BUILTIN_ACCOUNT_IDS: BuiltinAccountId[] = ACCOUNTS.map((a) => a.value);

// Extra savings accounts: "sv_" + a few random letters/digits (fits varchar(20))
export type ExtraSavingsId = `sv_${string}`;
export type AccountId = BuiltinAccountId | ExtraSavingsId;

// Every account except Sadqa (it isn't money, only a reminder).
// Spend, lend, add, move and give Sadqa with these.
export type SpendingAccount = Exclude<AccountId, "sadqa">;

// How much is in each account, e.g. { current: 47500, savings: 90000, ... }
// Extra savings accounts with no money movements yet may be missing:
// always read with balanceOf().
export type Balances = Record<AccountId, number>;

export const EMPTY_BALANCES = {
  current: 0,
  savings: 0,
  pocket: 0,
  sadqa: 0,
} as Balances;

export function balanceOf(balances: Balances, account: AccountId): number {
  return balances[account] ?? 0;
}

// Everything the UI needs to show one account. Built per user, because the
// extra savings accounts (and their names) are different for everyone.
export type AccountInfo = {
  value: AccountId;
  label: string;
  icon: IconName;
  tone: string;
  description: string;
  kind: BuiltinAccountId; // what it behaves like ("savings" for extra ones)
};

const SAVINGS_INFO = ACCOUNTS[1];

// The user's accounts in display order: Current, Savings (+ extra ones), Pocket, Sadqa.
// `savingsName`: the user renamed the built-in Savings (e.g. "Emergency fund").
export function buildAccounts(extra: { key: string; name: string }[], savingsName?: string): AccountInfo[] {
  const builtin = (value: BuiltinAccountId): AccountInfo => {
    const a = ACCOUNTS.find((x) => x.value === value)!;
    return { ...a, kind: a.value };
  };
  return [
    builtin("current"),
    { ...builtin("savings"), label: savingsName ?? SAVINGS_INFO.label },
    ...extra.map(
      (e): AccountInfo => ({
        value: e.key as ExtraSavingsId,
        label: e.name,
        icon: SAVINGS_INFO.icon,
        tone: SAVINGS_INFO.tone,
        description: "One of your savings accounts.",
        kind: "savings",
      }),
    ),
    builtin("pocket"),
    builtin("sadqa"),
  ];
}

// Only the built-in ones. Enough wherever extra accounts can't appear.
export const BUILTIN_ACCOUNTS: AccountInfo[] = buildAccounts([]);

export function isBuiltinAccount(value: unknown): value is BuiltinAccountId {
  return BUILTIN_ACCOUNT_IDS.includes(value as BuiltinAccountId);
}

const EXTRA_KEY = /^sv_[a-z0-9]{6,16}$/;

export function isExtraSavings(value: unknown): value is ExtraSavingsId {
  return typeof value === "string" && EXTRA_KEY.test(value);
}

// Does it LOOK like an account id? (Whether an extra savings account really
// belongs to the user is checked on the server, in the services.)
export function isAccount(value: unknown): value is AccountId {
  return isBuiltinAccount(value) || isExtraSavings(value);
}

export function isSpendingAccount(value: unknown): value is SpendingAccount {
  return isAccount(value) && value !== "sadqa";
}

export function isSavingsAccount(value: unknown): value is "savings" | ExtraSavingsId {
  return value === "savings" || isExtraSavings(value);
}

export function getAccount(value: string, accounts: AccountInfo[] = BUILTIN_ACCOUNTS): AccountInfo {
  return (
    accounts.find((a) => a.value === value) ??
    // An extra savings account we don't know the name of (e.g. closed)
    (isExtraSavings(value) ? { ...buildAccounts([{ key: value, name: "Savings" }])[2] } : accounts[0])
  );
}

export function accountLabel(value: string, accounts?: AccountInfo[]): string {
  return getAccount(value, accounts).label;
}

// Filters for the account pickers
export function spendingAccountsOf(accounts: AccountInfo[]): SpendingAccount[] {
  return accounts.filter((a) => a.value !== "sadqa").map((a) => a.value as SpendingAccount);
}

export function savingsAccountsOf(accounts: AccountInfo[]): ("savings" | ExtraSavingsId)[] {
  return accounts.filter((a) => a.kind === "savings").map((a) => a.value as "savings" | ExtraSavingsId);
}

// Every kind of money movement we record (stored in ledger_entries.type).
// These names are for the code only - the UI always shows plain sentences.
export const LEDGER_TYPES = [
  "opening", // starting balance of an account
  "deposit", // "Add money"
  "transfer", // "Move money"
  "savings_borrow", // borrowed from a savings account
  "savings_repay", // paid a savings account back
  "income", // income received into Current
  "sadqa_allocation", // part of income added to "Sadqa to give" (no money moves)
  "savings_allocation", // part of income saved: Current -> a savings account
  "sadqa_given", // Sadqa given away: out of a real account, off "Sadqa to give"
  "loan_given", // I lent money to someone
  "loan_taken", // I borrowed money from someone
  "loan_payment_in", // someone paid me back
  "loan_payment_out", // I paid someone back
] as const;

export type LedgerType = (typeof LEDGER_TYPES)[number];
