"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

// Rules for register("…", percentRules): a number from 0 to 100.
export const percentRules = {
  setValueAs: (v: unknown) =>
    typeof v === "number" ? v : String(v ?? "").trim() === "" ? NaN : Number(v),
  validate: (v: number) => (Number.isFinite(v) && v >= 0 && v <= 100) || "Enter a number from 0 to 100",
};

// A small "[ 2.5 ] %" input with quick-pick buttons (0%, 5%, 10%…).
// Used for the Sadqa % and the savings %.
export function PercentField({
  id,
  label,
  registration,
  error,
  value,
  quickPicks,
  onPick,
}: {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  value: number;
  quickPicks: number[];
  onPick: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative max-w-[10rem]">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={`input-amount pr-10 pl-4 ${error ? "input-error" : ""}`}
          {...registration}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xl font-semibold text-muted"
        >
          %
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {quickPicks.map((pick) => (
          <button
            key={pick}
            type="button"
            aria-pressed={value === pick}
            className={`chip ${value === pick ? "chip-selected" : ""}`}
            onClick={() => onPick(pick)}
          >
            {pick}%
          </button>
        ))}
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
