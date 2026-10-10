"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { spendingAccountsOf } from "@/lib/accounts";
import { useAccounts } from "@/components/accounts-context";
import { AccountPicker } from "@/components/form/account-picker";

// "Pay from": which account an expected expense will be paid from. It then shows up
// on that account's page. Works in any form with an `account` field.
export function PayFromField<T extends FieldValues & { account: string }>({
  control,
  error,
}: {
  control: Control<T>;
  error?: string;
}) {
  const options = spendingAccountsOf(useAccounts());
  return (
    <Controller
      name={"account" as Path<T>}
      control={control}
      rules={{ required: "Pick which account you'll pay from" }}
      render={({ field }) => (
        <AccountPicker
          label="Pay from"
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          options={options}
          error={error}
        />
      )}
    />
  );
}
