"use client";

import { Icon, type IconName } from "@/components/icons";

type Props<T extends string> = {
  label: string;
  value: string;
  onChange: (value: T) => void;
  onBlur?: () => void;
  options: readonly { value: T; label: string; icon?: IconName }[];
  error?: string;
};

// A row of big tappable choices (categories, "How often?", Yes / Not yet...).
// Use it inside RHF's <Controller>.
export function ChoiceChips<T extends string>({
  label,
  value,
  onChange,
  onBlur,
  options,
  error,
}: Props<T>) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              onBlur={onBlur}
              className={`chip ${selected ? "chip-selected" : ""}`}
            >
              {option.icon && <Icon name={option.icon} className="size-4" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <p className="error-text">{error}</p>}
    </fieldset>
  );
}
