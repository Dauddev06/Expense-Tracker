"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import {
  accountLabel,
  balanceOf,
  savingsAccountsOf,
  spendingAccountsOf,
  type AccountId,
  type AccountInfo,
  type Balances,
} from "@/lib/accounts";
import type { MoneyAction } from "@/lib/money-input";
import type { OwedBySavings } from "@/lib/services/balance.service";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useAccounts } from "@/components/accounts-context";
import { usePrefetch } from "@/components/form/use-prefetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { AccountPicker } from "@/components/form/account-picker";
import { DateField } from "@/components/form/date-field";
import { EffectPreview, type BalanceChange } from "@/components/form/effect-preview";
import { FormError } from "@/components/form/form-error";
import { useToday } from "@/components/form/use-today";

type Values = {
  amount: number;
  fromAccount: AccountId | "";
  toAccount: AccountId | "";
  occurredOn: string;
  note: string;
};

// Everything that differs between the five actions, in one place.
type Setup = {
  // Choices for "from" / "to". An empty list = not shown (fixed or unused).
  fromOptions: AccountId[];
  toOptions: AccountId[];
  defaultFrom: AccountId | "";
  defaultTo: AccountId | "";
  fromLabel: string;
  toLabel: string;
  noteLabel: string;
  button: string;
  done: (amount: string, from: string, to: string) => string; // success message
};

const CURRENT_OR_POCKET: AccountId[] = ["current", "pocket"];

// Built from the user's accounts, because extra savings accounts differ per user.
// With ONE choice there is nothing to pick, so the picker is hidden.
function setupFor(type: MoneyAction, accounts: AccountInfo[], owed: OwedBySavings): Setup {
  const spendable = spendingAccountsOf(accounts);
  const savings = savingsAccountsOf(accounts);
  // Repay: only the savings accounts you actually owe money to
  const owedSavings = savings.filter((a) => (owed[a] ?? 0) > 0);
  const hideIfOne = (list: AccountId[]) => (list.length > 1 ? list : []);

  switch (type) {
    case "deposit":
      return {
        fromOptions: [],
        toOptions: spendable,
        defaultFrom: "",
        defaultTo: "current",
        fromLabel: "",
        toLabel: "Put it into",
        noteLabel: "Where is it from?",
        button: "Add money",
        done: (amount, _from, to) => `${amount} added to ${to}`,
      };
    case "transfer":
      return {
        fromOptions: spendable,
        toOptions: spendable,
        defaultFrom: "current",
        defaultTo: "pocket",
        fromLabel: "Move from",
        toLabel: "Move to",
        noteLabel: "Note",
        button: "Move money",
        done: (amount, _from, to) => `${amount} moved to ${to}`,
      };
    case "savings_borrow":
      return {
        fromOptions: hideIfOne(savings),
        toOptions: CURRENT_OR_POCKET,
        defaultFrom: "savings",
        defaultTo: "current",
        fromLabel: "Borrow from",
        toLabel: "Put it into",
        noteLabel: "What is it for?",
        button: "Borrow",
        done: (amount, from, to) => `Borrowed ${amount} from ${from} into ${to}`,
      };
    case "savings_repay":
      return {
        fromOptions: CURRENT_OR_POCKET,
        toOptions: hideIfOne(owedSavings),
        defaultFrom: "current",
        defaultTo: owedSavings[0] ?? "savings",
        fromLabel: "Pay from",
        toLabel: "Pay back to",
        noteLabel: "Note",
        button: "Pay back",
        done: (amount, _from, to) => `${amount} paid back to ${to}`,
      };
    case "sadqa_given":
      return {
        fromOptions: [],
        toOptions: [],
        defaultFrom: "sadqa",
        defaultTo: "",
        fromLabel: "",
        toLabel: "",
        noteLabel: "Given to / for",
        button: "Give Sadqa",
        done: (amount) => `Gave ${amount} as Sadqa`,
      };
  }
}

// The preset account, if it's one of the allowed choices
function pick(options: AccountId[], preset?: string): AccountId | null {
  return options.includes(preset as AccountId) ? (preset as AccountId) : null;
}

type Props = {
  type: MoneyAction;
  balances: Balances;
  owedBySavings: OwedBySavings;
  // Pre-pick accounts, e.g. "Move money" from the Pocket page starts with Pocket.
  // Ignored when the account isn't one of this action's choices.
  presetFrom?: string;
  presetTo?: string;
};

export function MoneyActionForm({ type, balances, owedBySavings, presetFrom, presetTo }: Props) {
  const accounts = useAccounts();
  const setup = setupFor(type, accounts, owedBySavings);
  const router = useRouter();
  usePrefetch("/accounts"); // where "Save" goes
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { today, yesterday } = useToday();

  // Starting accounts: the preset ones if allowed, otherwise the defaults.
  // "Move money" can't start as Pocket -> Pocket, so pick another "to" then.
  const startFrom = pick(setup.fromOptions, presetFrom) ?? setup.defaultFrom;
  let startTo = pick(setup.toOptions, presetTo) ?? setup.defaultTo;
  if (startTo && startTo === startFrom && setup.toOptions.length > 0) {
    startTo = setup.toOptions.find((a) => a !== startFrom) ?? startTo;
  }

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      amount: undefined as unknown as number,
      fromAccount: startFrom,
      toAccount: startTo,
      occurredOn: today,
      note: "",
    },
  });

  const label = (account: AccountId | "") => (account ? accountLabel(account, accounts) : "");
  const [amount, fromAccount, toAccount, occurredOn] = useWatch({
    control,
    name: ["amount", "fromAccount", "toAccount", "occurredOn"],
  });

  async function onSubmit(values: Values) {
    setServerError(null);
    const { ok, data } = await sendJson("/api/money", "POST", {
      ...values,
      type,
      fromAccount: values.fromAccount || null,
      toAccount: values.toAccount || null,
    });
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    showToast(setup.done(formatMoney(values.amount), label(values.fromAccount), label(values.toAccount)));
    router.push("/accounts");
  }

  // Fill the amount field from a shortcut button ("Give all", "Repay all")
  const fillAmount = (value: number) =>
    setValue("amount", value, { shouldDirty: true, shouldValidate: true });

  // Repay: how much you owe the savings account picked right now
  const owedNow = type === "savings_repay" && toAccount ? (owedBySavings[toAccount] ?? 0) : 0;
  const sadqa = balanceOf(balances, "sadqa");

  const changes: BalanceChange[] = [];
  if (fromAccount) changes.push({ account: fromAccount, delta: -amount });
  if (toAccount) changes.push({ account: toAccount, delta: amount });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />

      {type === "savings_repay" && (
        <p className="rounded-xl bg-warning-soft px-3 py-2 text-warning">
          You owe {label(toAccount)} <strong>{formatMoney(owedNow)}</strong>.
        </p>
      )}
      {type === "sadqa_given" && (
        <p className="rounded-xl bg-positive-soft px-3 py-2 text-positive">
          Sadqa set aside: <strong>{formatMoney(sadqa)}</strong>
        </p>
      )}

      <AmountField
        id="amount"
        label="How much?"
        autoFocus
        registration={register("amount", amountRules())}
        error={errors.amount?.message}
      >
        {type === "sadqa_given" && sadqa > 0 && (
          <button type="button" className="chip mt-2" onClick={() => fillAmount(sadqa)}>
            Give all ({formatMoney(sadqa)})
          </button>
        )}
        {owedNow > 0 && (
          <button type="button" className="chip mt-2" onClick={() => fillAmount(owedNow)}>
            Repay all ({formatMoney(owedNow)})
          </button>
        )}
      </AmountField>

      {setup.fromOptions.length > 0 && (
        <Controller
          name="fromAccount"
          control={control}
          rules={{ required: "Pick an account" }}
          render={({ field }) => (
            <AccountPicker
              label={setup.fromLabel}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={setup.fromOptions}
              balances={balances}
              error={errors.fromAccount?.message}
            />
          )}
        />
      )}

      {setup.toOptions.length > 0 && (
        <Controller
          name="toAccount"
          control={control}
          rules={{
            required: "Pick an account",
            validate: (value, all) =>
              type !== "transfer" || value !== all.fromAccount || "Pick a different account to move to",
          }}
          render={({ field }) => (
            <AccountPicker
              label={setup.toLabel}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={setup.toOptions}
              balances={balances}
              error={errors.toAccount?.message}
            />
          )}
        />
      )}

      <DateField
        id="occurredOn"
        label="When?"
        registration={register("occurredOn", { required: "Pick a date" })}
        error={errors.occurredOn?.message}
        value={occurredOn}
        today={today}
        yesterday={yesterday}
        onPick={(date) => setValue("occurredOn", date, { shouldValidate: true })}
      />

      <div>
        <label htmlFor="note" className="label">
          {setup.noteLabel} <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="note" className="input" {...register("note")} />
      </div>

      <EffectPreview balances={balances} changes={changes} />

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 sm:flex-none">
          {isSubmitting ? "Saving..." : setup.button}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
