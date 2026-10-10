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
  // "new" = money moves now. "old" = from before using the app: the money
  // moved long ago, so adding it changes no balance.
  when: "new" | "old";
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
      when: "new",
    },
  });
  const [direction, personName, amount, account, startedOn, when] = useWatch({
    control,
    name: ["direction", "personName", "amount", "account", "startedOn", "when"],
  });
  const lent = direction === "given";
  const old = when === "old";
  const who = personName.trim() || "them";

  // When editing, undo the loan's current effect first so the preview is right
  // (an old loan never had one)
  const startBalances = { ...balances };
  if (initial && initial.when === "new") {
    startBalances[initial.account] =
      balanceOf(startBalances, initial.account) + (initial.direction === "given" ? initial.amount : -initial.amount);
  }

  async function onSubmit(values: Values) {
    setServerError(null);
    const body = { ...values, alreadyExisted: values.when === "old" };
    const { ok, data } = loanId
      ? await sendJson(`/api/loans/${loanId}`, "PATCH", body)
      : await sendJson("/api/loans", "POST", body);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    const loan = data.loan as { id: string };
    showToast(
      loanId
        ? "Saved"
        : values.when === "old"
          ? values.direction === "given"
            ? `Saved: ${values.personName} owes you ${formatMoney(values.amount)}`
            : `Saved: you owe ${values.personName} ${formatMoney(values.amount)}`
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
        <Controller
          name="when"
          control={control}
          render={({ field }) => (
            <ChoiceChips
              label="When did this loan start?"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={[
                { value: "new", label: "Now, money moves" },
                { value: "old", label: "Before I used this app" },
              ]}
            />
          )}
        />
        {old && (
          <p className="hint-text">
            Your balances won&apos;t change: this money moved before your starting balances.
            Payments you add later will move money as usual.
          </p>
        )}
      </div>

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
                label={
                  old
                    ? lent
                      ? "Money paid back will go into"
                      : "You'll pay back from"
                    : lent
                      ? "Money left from"
                      : "Money went into"
                }
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
        label={old ? "When did it start? (roughly is fine)" : "When?"}
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

      {!amountLocked && !old && (
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
              : old
                ? lent
                  ? `Save: ${who} owes me`
                  : `Save: I owe ${who}`
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
