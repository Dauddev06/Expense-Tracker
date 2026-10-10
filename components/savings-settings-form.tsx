"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { accountLabel, savingsAccountsOf } from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useAccounts } from "@/components/accounts-context";
import { useToast } from "@/components/toast";
import { AccountPicker } from "@/components/form/account-picker";
import { FormError } from "@/components/form/form-error";
import { PercentField, percentRules } from "@/components/form/percent-field";

type Values = { savingsPercent: number; savingsAccount: string };

// "What % of every income should go into which savings account?"
export function SavingsSettingsForm({ savingsPercent, savingsAccount }: Values) {
  const router = useRouter();
  const showToast = useToast();
  const accounts = useAccounts();
  const options = savingsAccountsOf(accounts);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    defaultValues: {
      savingsPercent,
      // The saved account may have been closed since: fall back to Savings
      savingsAccount: options.includes(savingsAccount as never) ? savingsAccount : "savings",
    },
  });
  const [percent, account] = useWatch({ control, name: ["savingsPercent", "savingsAccount"] });

  async function onSubmit(values: Values) {
    setServerError(null);
    const { ok, data } = await sendJson("/api/settings", "PUT", values);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    showToast(
      values.savingsPercent > 0
        ? `${values.savingsPercent}% of every income now goes to ${accountLabel(values.savingsAccount, accounts)}`
        : "Saving from income is off",
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />
      <PercentField
        id="savingsPercent"
        label="Part of each income to save"
        registration={register("savingsPercent", percentRules)}
        error={errors.savingsPercent?.message}
        value={percent}
        quickPicks={[0, 5, 10, 20]}
        onPick={(v) => setValue("savingsPercent", v, { shouldDirty: true, shouldValidate: true })}
      />

      {percent > 0 && (
        <div>
          <Controller
            name="savingsAccount"
            control={control}
            render={({ field }) => (
              <AccountPicker
                label="Save it into"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={options}
                error={errors.savingsAccount?.message}
              />
            )}
          />
          <p className="hint-text">
            Example: on an income of {formatMoney(100000)},{" "}
            {formatMoney(Math.round(100000 * percent) / 100)} goes into {accountLabel(account, accounts)}.{" "}
            <Link href="/accounts/new" className="font-medium text-brand-ink underline">
              Add another savings account
            </Link>
          </p>
        </div>
      )}

      <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary w-full sm:w-auto">
        {isSubmitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
