"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ACCOUNTS, type Balances } from "@/lib/accounts";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { FormError } from "@/components/form/form-error";

type Props = {
  initial: Balances;
  includeSadqa: boolean; // the welcome flow only asks for the first three
  submitLabel: string;
  onSaved?: (values: Balances) => void; // the welcome flow goes to its next step instead
};

// "How much money do you have right now?" - one amount per account.
export function OpeningBalancesForm({ initial, includeSadqa, submitLabel, onSaved }: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const accounts = ACCOUNTS.filter((a) => includeSadqa || a.value !== "sadqa");

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Balances>({ defaultValues: initial });

  async function onSubmit(values: Balances) {
    setServerError(null);
    const { ok, data } = await sendJson("/api/accounts/opening", "PUT", values);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    showToast("Starting balances saved");
    if (onSaved) {
      onSaved(values);
      return;
    }
    router.push("/accounts");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />
      {accounts.map((account, index) => (
        <AmountField
          key={account.value}
          id={account.value}
          label={account.label}
          autoFocus={index === 0}
          registration={register(account.value, amountRules({ allowZero: true }))}
          error={errors[account.value]?.message}
        />
      ))}
      <p className="hint-text">Don&apos;t have money in one of these? Leave it at 0.</p>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
