"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import { accountLabel, type AccountId, type Balances } from "@/lib/accounts";
import type { MoneyAction } from "@/lib/money-input";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
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
  fromOptions: readonly AccountId[] | null; // null = fixed / not used
  toOptions: readonly AccountId[] | null;
  fixedFrom: AccountId | "";
  fixedTo: AccountId | "";
  defaultFrom: AccountId | "";
  defaultTo: AccountId | "";
  fromLabel: string;
  toLabel: string;
  noteLabel: string;
  button: string;
  done: (amount: string, from: string, to: string) => string; // success message
};

const SETUPS: Record<MoneyAction, Setup> = {
  deposit: {
    fromOptions: null,
    toOptions: ["current", "savings", "pocket"],
    fixedFrom: "",
    fixedTo: "",
    defaultFrom: "",
    defaultTo: "current",
    fromLabel: "",
    toLabel: "Put it into",
    noteLabel: "Where is it from?",
    button: "Add money",
    done: (amount, _from, to) => `${amount} added to ${to}`,
  },
  transfer: {
    fromOptions: ["current", "savings", "pocket"],
    toOptions: ["current", "savings", "pocket"],
    fixedFrom: "",
    fixedTo: "",
    defaultFrom: "current",
    defaultTo: "pocket",
    fromLabel: "Move from",
    toLabel: "Move to",
    noteLabel: "Note",
    button: "Move money",
    done: (amount, _from, to) => `${amount} moved to ${to}`,
  },
  savings_borrow: {
    fromOptions: null,
    toOptions: ["current", "pocket"],
    fixedFrom: "savings",
    fixedTo: "",
    defaultFrom: "savings",
    defaultTo: "current",
    fromLabel: "",
    toLabel: "Put it into",
    noteLabel: "What is it for?",
    button: "Borrow from Savings",
    done: (amount, _from, to) => `Borrowed ${amount} from Savings into ${to}`,
  },
  savings_repay: {
    fromOptions: ["current", "pocket"],
    toOptions: null,
    fixedFrom: "",
    fixedTo: "savings",
    defaultFrom: "current",
    defaultTo: "savings",
    fromLabel: "Pay from",
    toLabel: "",
    noteLabel: "Note",
    button: "Repay Savings",
    done: (amount) => `${amount} paid back to Savings`,
  },
  sadqa_given: {
    fromOptions: null,
    toOptions: null,
    fixedFrom: "sadqa",
    fixedTo: "",
    defaultFrom: "sadqa",
    defaultTo: "",
    fromLabel: "",
    toLabel: "",
    noteLabel: "Given to / for",
    button: "Give Sadqa",
    done: (amount) => `Gave ${amount} as Sadqa`,
  },
};

// The preset account, if it's allowed for this action
function pick(options: readonly AccountId[] | null, preset?: string): AccountId | null {
  return options && options.includes(preset as AccountId) ? (preset as AccountId) : null;
}

type Props = {
  type: MoneyAction;
  balances: Balances;
  owedToSavings: number;
  // Pre-pick accounts, e.g. "Move money" from the Pocket page starts with Pocket.
  // Ignored when the account isn't one of this action's choices.
  presetFrom?: string;
  presetTo?: string;
};

export function MoneyActionForm({ type, balances, owedToSavings, presetFrom, presetTo }: Props) {
  const setup = SETUPS[type];
  const router = useRouter();
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { today, yesterday } = useToday();

  // Starting accounts: the preset ones if allowed, otherwise the defaults.
  // "Move money" can't start as Pocket -> Pocket, so pick another "to" then.
  const startFrom = pick(setup.fromOptions, presetFrom) ?? setup.defaultFrom;
  let startTo = pick(setup.toOptions, presetTo) ?? setup.defaultTo;
  if (startTo && startTo === startFrom && setup.toOptions) {
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
    showToast(
      setup.done(
        formatMoney(values.amount),
        values.fromAccount ? accountLabel(values.fromAccount) : "",
        values.toAccount ? accountLabel(values.toAccount) : "",
      ),
    );
    router.push("/accounts");
    router.refresh();
  }

  // Fill the amount field from a shortcut button ("Give all", "Repay all")
  const fillAmount = (value: number) =>
    setValue("amount", value, { shouldDirty: true, shouldValidate: true });

  const changes: BalanceChange[] = [];
  if (fromAccount) changes.push({ account: fromAccount, delta: -amount });
  if (toAccount) changes.push({ account: toAccount, delta: amount });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />

      {type === "savings_repay" && (
        <p className="rounded-xl bg-warning-soft px-3 py-2 text-warning">
          You owe Savings <strong>{formatMoney(owedToSavings)}</strong>.
        </p>
      )}
      {type === "sadqa_given" && (
        <p className="rounded-xl bg-positive-soft px-3 py-2 text-positive">
          Sadqa set aside: <strong>{formatMoney(balances.sadqa)}</strong>
        </p>
      )}

      <AmountField
        id="amount"
        label="How much?"
        autoFocus
        registration={register("amount", amountRules())}
        error={errors.amount?.message}
      >
        {type === "sadqa_given" && balances.sadqa > 0 && (
          <button type="button" className="chip mt-2" onClick={() => fillAmount(balances.sadqa)}>
            Give all ({formatMoney(balances.sadqa)})
          </button>
        )}
        {type === "savings_repay" && owedToSavings > 0 && (
          <button type="button" className="chip mt-2" onClick={() => fillAmount(owedToSavings)}>
            Repay all ({formatMoney(owedToSavings)})
          </button>
        )}
      </AmountField>

      {setup.fromOptions && (
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
              options={setup.fromOptions!}
              balances={balances}
              error={errors.fromAccount?.message}
            />
          )}
        />
      )}

      {setup.toOptions && (
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
              options={setup.toOptions!}
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
