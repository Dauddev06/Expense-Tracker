"use client";

import { createContext, useContext } from "react";
import { BUILTIN_ACCOUNTS, type AccountInfo } from "@/lib/accounts";

// The logged-in user's accounts (Current, Savings, their extra savings
// accounts, Pocket, Sadqa). The (app) layout loads them once and puts them
// here, so any form can show account names without extra props.
const AccountsContext = createContext<AccountInfo[]>(BUILTIN_ACCOUNTS);

export function AccountsProvider({
  accounts,
  children,
}: {
  accounts: AccountInfo[];
  children: React.ReactNode;
}) {
  return <AccountsContext.Provider value={accounts}>{children}</AccountsContext.Provider>;
}

export function useAccounts(): AccountInfo[] {
  return useContext(AccountsContext);
}
