"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import { balanceOf, isSpendingAccount, spendingAccountsOf, type Balances, type SpendingAccount } from "@/lib/accounts";
import { useAccounts } from "@/components/accounts-context";
import type { LoanDirection } from "@/lib/db/entities/Loan";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { usePrefetch } from "@/components/form/use-prefetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { AccountPicker } from "@/components/form/account-picker";
import { ChoiceChips } from "@/components/form/choice-chips";
import { DateField } from "@/components/form/date-field";
import { EffectPreview } from "@/components/form/effect-preview";
import { FormError } from "@/components/form/form-error";
import { useToday } from "@/components/form/use-today";

type Values = {
  direction: LoanDirection;
  personName: string;
  amount: number;
  account: SpendingAccount;
  startedOn: string;
  note: string;
};

type Props = {
  balances: Balances;
  loanId?: string; // set when editing
  initial?: Values;
  amountLocked?: boolean; // true once a payment exists
  presetAccount?: string; // e.g. "pocket" when you start from the Pocket page
};

export function LoanForm({ balances, loanId, initial, amountLocked = false, presetAccount }: Props) {
  const router = useRouter();
  usePrefetch(loanId ? `/loans/${loanId}` : null); // where "Save" goes when editing
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { today, yesterday } = useToday();
  const accounts = useAccounts();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    defaultValues: initial ?? {
      direction: "given",
      personName: "",
      amount: undefined as unknown as number,
      account: isSpendingAccount(presetAccount) ? presetAccount : "current",
      startedOn: today,
      note: "",
    },
  });
  const [direction, personName, amount, account, startedOn] = useWatch({
    control,
    name: ["direction", "personName", "amount", "account", "startedOn"],
  });
  const lent = direction === "given";
  const who = personName.trim() || "them";

  // When editing, undo the loan's current effect first so the preview is right
  const startBalances = { ...balances };
  if (initial) {
    startBalances[initial.account] =
      balanceOf(startBalances, initial.account) + (initial.direction === "given" ? initial.amount : -initial.amount);
  }

  async function onSubmit(values: Values) {
    setServerError(null);
    const { ok, data } = loanId
      ? await sendJson(`/api/loans/${loanId}`, "PATCH", values)
      : await sendJson("/api/loans", "POST", values);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    const loan = data.loan as { id: string };
    showToast(
      loanId
        ? "Saved"
        : values.direction === "given"
          ? `Lent ${formatMoney(values.amount)} to ${values.personName}`
          : `Borrowed ${formatMoney(values.amount)} from ${values.personName}`,
    );
    router.push(`/loans/${loan.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />

      {!loanId && (
        <Controller
          name="direction"
          control={control}
          render={({ field }) => (
            <ChoiceChips
              label="What happened?"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={[
                { value: "given", label: "I lent money", icon: "arrow-out" },
                { value: "taken", label: "I borrowed money", icon: "arrow-in" },
              ]}
              error={errors.direction?.message}
            />
          )}
        />
      )}

      <div>
        <label htmlFor="personName" className="label">
          {lent ? "Who did you lend it to?" : "Who did you borrow from?"}
        </label>
        <input
          id="personName"
          autoComplete="off"
          className={`input ${errors.personName ? "input-error" : ""}`}
          placeholder="e.g. Ali"
          {...register("personName", {
            required: "Who is it? Enter a name",
            maxLength: { value: 100, message: "Keep the name under 100 characters" },
          })}
        />
        {errors.personName && <p className="error-text">{errors.personName.message}</p>}
      </div>

      {amountLocked ? (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-ink-2">
          Amount: <strong>{formatMoney(initial!.amount)}</strong>. It can&apos;t be changed after a
          payment was made.
        </p>
      ) : (
        <>
          <AmountField
            id="amount"
            label="How much?"
            registration={register("amount", amountRules())}
            error={errors.amount?.message}
          />
          <Controller
            name="account"
            control={control}
            rules={{ required: "Pick an account" }}
            render={({ field }) => (
              <AccountPicker
                label={lent ? "Money left from" : "Money went into"}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={spendingAccountsOf(accounts)}
                balances={startBalances}
                error={errors.account?.message}
              />
            )}
          />
        </>
      )}

      <DateField
        id="startedOn"
        label="When?"
        registration={register("startedOn", { required: "Pick a date" })}
        error={errors.startedOn?.message}
        value={startedOn}
        today={today}
        yesterday={yesterday}
        onPick={(date) => setValue("startedOn", date, { shouldDirty: true, shouldValidate: true })}
      />

      <div>
        <label htmlFor="note" className="label">
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="note" className="input" placeholder="e.g. For his bike repair" {...register("note")} />
      </div>

      {!amountLocked && (
        <EffectPreview balances={startBalances} changes={[{ account, delta: lent ? -amount : amount }]} />
      )}

      <div className="form-actions">
        <button
          type="submit"
          disabled={isSubmitting || (!!loanId && !isDirty)}
          className="btn-primary flex-1 sm:flex-none"
        >
          {isSubmitting
            ? "Saving..."
            : loanId
              ? "Save changes"
              : lent
                ? `Save: I lent to ${who}`
                : `Save: I borrowed from ${who}`}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
