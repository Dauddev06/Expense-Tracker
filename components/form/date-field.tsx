"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

type Props = {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  value: string; // the current value (from useWatch), to highlight the quick button
  today: string;
  yesterday: string;
  onPick: (date: string) => void; // usually setValue(name, date)
  max?: string; // defaults to today: these dates are for things that already happened
};

// A date input with quick "Today" / "Yesterday" buttons.
export function DateField({ id, label, registration, error, value, today, yesterday, onPick, max }: Props) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="date"
          max={max ?? today}
          className={`input max-w-[12rem] ${error ? "input-error" : ""}`}
          {...registration}
        />
        <button
          type="button"
          aria-pressed={value === today}
          className={`chip ${value === today ? "chip-selected" : ""}`}
          onClick={() => onPick(today)}
        >
          Today
        </button>
        <button
          type="button"
          aria-pressed={value === yesterday}
          className={`chip ${value === yesterday ? "chip-selected" : ""}`}
          onClick={() => onPick(yesterday)}
        >
          Yesterday
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
