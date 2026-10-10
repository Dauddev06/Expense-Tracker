"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import {
  accountLabel,
  balanceOf,
  isSpendingAccount,
  spendingAccountsOf,
  type Balances,
  type SpendingAccount,
} from "@/lib/accounts";
import { useAccounts } from "@/components/accounts-context";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { usePrefetch } from "@/components/form/use-prefetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { AccountPicker } from "@/components/form/account-picker";
import { DateField } from "@/components/form/date-field";
import { EffectPreview } from "@/components/form/effect-preview";
import { FormError } from "@/components/form/form-error";
import { useToday } from "@/components/form/use-today";

export type SpendingFormValues = {
  title: string;
  amount: number;
  spentOn: string;
  note: string;
  account: SpendingAccount;
};

type Props = {
  // "create" -> POST /api/spendings, "edit" -> PATCH /api/spendings/:id
  mode: "create" | "edit";
  spendingId?: string;
  defaultValues?: SpendingFormValues;
  balances: Balances; // current balances, shown under each account chip
  presetAccount?: string; // e.g. "pocket" when you start from the Pocket page
};

export function SpendingForm({ mode, spendingId, defaultValues, balances, presetAccount }: Props) {
  const router = useRouter();
  // where "Save" goes: the list (new spending) or this spending (edit)
  usePrefetch(mode === "create" ? "/spendings" : `/spendings/${spendingId}`);
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { today, yesterday } = useToday();
  const accounts = useAccounts();
  const options = spendingAccountsOf(accounts);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SpendingFormValues>({
    defaultValues: defaultValues ?? {
      title: "",
      amount: undefined as unknown as number, // empty input to start with
      spentOn: today,
      note: "",
      account: isSpendingAccount(presetAccount) && options.includes(presetAccount) ? presetAccount : "current",
    },
  });

  // Subscribe to just the fields the preview and quick buttons need
  const [spentOn, amount, account] = useWatch({
    control,
    name: ["spentOn", "amount", "account"],
  });

  // When editing, this spending is ALREADY taken out of its account.
  // Put it back first, so the preview shows the real effect of the change.
  const startBalances = { ...balances };
  if (mode === "edit" && defaultValues) {
    startBalances[defaultValues.account] = balanceOf(startBalances, defaultValues.account) + defaultValues.amount;
  }

  async function onSubmit(values: SpendingFormValues) {
    setServerError(null);

    const url = mode === "create" ? "/api/spendings" : `/api/spendings/${spendingId}`;
    const { ok, data } = await sendJson(url, mode === "create" ? "POST" : "PATCH", values);

    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }

    showToast(
      mode === "create"
        ? `Spent ${formatMoney(values.amount)} from ${accountLabel(values.account, accounts)}`
        : "Saved",
    );
    // New spending: back to the list (the month it belongs to), where it
    // now shows at the top. Edit: back to that spending.
    // Pages are always rendered fresh, so push() alone shows the new data.
    // (An extra router.refresh() here would make the server render twice.)
    const month = values.spentOn.slice(0, 7);
    router.push(
      mode === "create"
        ? month === today.slice(0, 7)
          ? "/spendings"
          : `/spendings?chapter=${month}`
        : `/spendings/${spendingId}`,
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />

      <div>
        <label htmlFor="title" className="label">
          What did you spend on?
        </label>
        <input
          id="title"
          autoFocus
          className={`input ${errors.title ? "input-error" : ""}`}
          placeholder="e.g. Lunch with friends"
          {...register("title", {
            required: "Please say what it was for",
            maxLength: { value: 120, message: "Keep it under 120 characters" },
          })}
        />
        {errors.title && <p className="error-text">{errors.title.message}</p>}
      </div>

      <AmountField
        id="amount"
        label="How much?"
        registration={register("amount", amountRules())}
        error={errors.amount?.message}
      />

      {/* Account chips: a CUSTOM component, so we use <Controller> instead of register */}
      <Controller
        name="account"
        control={control}
        rules={{ required: "Pick where the money came from" }}
        render={({ field }) => (
          <AccountPicker
            label="Paid from"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={options}
            balances={startBalances}
            error={errors.account?.message}
          />
        )}
      />


      <DateField
        id="spentOn"
        label="When?"
        registration={register("spentOn", { required: "Pick a date" })}
        error={errors.spentOn?.message}
        value={spentOn}
        today={today}
        yesterday={yesterday}
        max={today}
        onPick={(date) => setValue("spentOn", date, { shouldDirty: true, shouldValidate: true })}
      />

      <div>
        <label htmlFor="note" className="label">
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="note"
          rows={2}
          className="input"
          placeholder="Anything you want to remember about this"
          {...register("note")}
        />
      </div>

      <EffectPreview balances={startBalances} changes={[{ account, delta: -amount }]} />

      <div className="form-actions">
        <button
          type="submit"
          disabled={isSubmitting || (mode === "edit" && !isDirty)}
          className="btn-primary flex-1 sm:flex-none"
        >
          {isSubmitting ? "Saving..." : mode === "create" ? "Add spending" : "Save changes"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
