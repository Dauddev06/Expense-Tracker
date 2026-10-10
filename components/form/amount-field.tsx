"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

// Rules for register("amount", amountRules()). The field is a text input
// (so phones show the number keyboard via inputMode) and we turn what was
// typed into a number ourselves. "1,500" works too.
export function amountRules(options: { allowZero?: boolean } = {}) {
  return {
    setValueAs: (value: unknown) => {
      if (typeof value === "number") return value;
      const text = String(value ?? "").replace(/[,\s]/g, "");
      return text === "" ? NaN : Number(text);
    },
    validate: (value: number) => {
      if (!Number.isFinite(value)) return "Enter an amount, like 1500";
      if (options.allowZero ? value < 0 : value <= 0)
        return options.allowZero ? "Can't be less than 0" : "Amount must be more than 0";
      return true;
    },
  };
}

type Props = {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  autoFocus?: boolean;
  children?: React.ReactNode; // extra buttons, e.g. "Pay full amount"
};

// A big amount input with "PKR" shown on the left.
export function AmountField({ id, label, registration, error, autoFocus, children }: Props) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} <span className="sr-only">in PKR</span>
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-semibold text-muted"
        >
          PKR
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal" // number keyboard on phones
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0"
          // Tapping the box selects what's there, so typing replaces a "0"
          onFocus={(e) => e.currentTarget.select()}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`input-amount ${error ? "input-error" : ""}`}
          {...registration}
        />
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="error-text">
          {error}
        </p>
      )}
    </div>
  );
}
