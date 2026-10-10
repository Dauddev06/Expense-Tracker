import type { ValueTransformer } from "typeorm";

// The pg driver returns numeric columns as STRINGS ("12.50") so it never
// loses precision. These transformers turn them back into JS numbers.
// (Same idea as the inline transformer in Spendings.ts.)
export const moneyTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

// For nullable numeric columns: keep null as null.
export const nullableMoneyTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
