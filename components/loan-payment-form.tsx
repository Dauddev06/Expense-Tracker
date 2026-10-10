"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import { SPENDING_ACCOUNTS, type Balances, type SpendingAccount } from "@/lib/accounts";
import type { LoanDirection } from "@/lib/db/entities/Loan";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { AccountPicker } from "@/components/form/account-picker";
import { DateField } from "@/components/form/date-field";
import { EffectPreview } from "@/components/form/effect-preview";
import { FormError } from "@/components/form/form-error";
import { useToday } from "@/components/form/use-today";

type Values = { amount: number; account: SpendingAccount; paidOn: string; note: string };

type Props = {
  loan: { id: string; personName: string; direction: LoanDirection; outstanding: number };
  balances: Balances;
};

// Add a partial or full payment to a loan.
export function LoanPaymentForm({ loan, balances }: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { today, yesterday } = useToday();
  const theyPay = loan.direction === "given"; // they are paying ME back

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: { amount: loan.outstanding, account: "current", paidOn: today, note: "" },
  });
  const [amount, account, paidOn] = useWatch({ control, name: ["amount", "account", "paidOn"] });

  async function onSubmit(values: Values) {
    setServerError(null);
    const { ok, data } = await sendJson(`/api/loans/${loan.id}/payments`, "POST", values);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    const updated = data.loan as { outstanding: number };
    showToast(
      theyPay
        ? `${loan.personName} paid back ${formatMoney(values.amount)}`
        : `Paid ${formatMoney(values.amount)} back to ${loan.personName}`,
    );
    reset({ amount: updated.outstanding, account: values.account, paidOn: today, note: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />
      <AmountField
        id="amount"
        label={theyPay ? `How much did ${loan.personName} pay back?` : "How much are you paying back?"}
        registration={register("amount", {
          ...amountRules(),
          validate: (v: number) =>
            amountRules().validate(v) === true
              ? v <= loan.outstanding || `Only ${formatMoney(loan.outstanding)} is left to pay.`
              : amountRules().validate(v),
        })}
        error={errors.amount?.message}
      >
        <button
          type="button"
          className="chip mt-2"
          onClick={() => setValue("amount", loan.outstanding, { shouldValidate: true })}
        >
          Pay full amount ({formatMoney(loan.outstanding)})
        </button>
      </AmountField>

      <Controller
        name="account"
        control={control}
        rules={{ required: "Pick an account" }}
        render={({ field }) => (
          <AccountPicker
            label={theyPay ? "Money went into" : "Paid from"}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={SPENDING_ACCOUNTS}
            balances={balances}
            error={errors.account?.message}
          />
        )}
      />

      <DateField
        id="paidOn"
        label="When?"
        registration={register("paidOn", { required: "Pick a date" })}
        error={errors.paidOn?.message}
        value={paidOn}
        today={today}
        yesterday={yesterday}
        onPick={(date) => setValue("paidOn", date, { shouldValidate: true })}
      />

      <div>
        <label htmlFor="payment-note" className="label">
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="payment-note" className="input" {...register("note")} />
      </div>

      <EffectPreview balances={balances} changes={[{ account, delta: theyPay ? amount : -amount }]} />

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
        {isSubmitting
          ? "Saving..."
          : theyPay
            ? `Save payment from ${loan.personName}`
            : `Pay back ${loan.personName}`}
      </button>
    </form>
  );
}
