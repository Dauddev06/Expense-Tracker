import type { EntityManager } from "typeorm";
import { getDataSource, getRepo } from "@/lib/db/data-source";
import type { UserSettings } from "@/lib/db/entities/UserSettings";
import type { SettingsInput } from "@/lib/income-input";
import { FieldError } from "./errors";
import { assertOwnAccounts } from "./savings-account.service";

export type SettingsDTO = {
  sadqaPercent: number; // % of every income set aside for Sadqa
  savingsPercent: number; // % of every income moved into savingsAccount
  savingsAccount: string; // "savings" or an extra savings account ("sv_...")
};

const DEFAULTS: SettingsDTO = { sadqaPercent: 0, savingsPercent: 0, savingsAccount: "savings" };

// Users who never opened Settings have no row yet: that means the defaults.
export async function readSettings(m: EntityManager, userId: string): Promise<SettingsDTO> {
  const row = await m.getRepository<UserSettings>("UserSettings").findOne({ where: { userId } });
  if (!row) return { ...DEFAULTS };
  return {
    sadqaPercent: row.sadqaPercent,
    savingsPercent: row.savingsPercent,
    savingsAccount: row.savingsAccount,
  };
}

export async function getSettings(userId: string): Promise<SettingsDTO> {
  const ds = await getDataSource();
  return readSettings(ds.manager, userId);
}

// Sadqa and savings both come out of the same income, so together they
// can't be more than all of it.
export function assertPercentsFit(sadqaPercent: number, savingsPercent: number, field: string) {
  if (sadqaPercent + savingsPercent > 100) {
    throw new FieldError(
      field,
      `Sadqa (${sadqaPercent}%) and savings (${savingsPercent}%) together can't be more than 100%.`,
    );
  }
}

// Saves only the parts that were sent (e.g. just the Sadqa %).
export async function updateSettings(userId: string, input: SettingsInput): Promise<SettingsDTO> {
  const ds = await getDataSource();
  const current = await readSettings(ds.manager, userId);
  const next: SettingsDTO = {
    sadqaPercent: input.sadqaPercent ?? current.sadqaPercent,
    savingsPercent: input.savingsPercent ?? current.savingsPercent,
    savingsAccount: input.savingsAccount ?? current.savingsAccount,
  };
  assertPercentsFit(next.sadqaPercent, next.savingsPercent, input.savingsPercent !== undefined ? "savingsPercent" : "sadqaPercent");
  if (input.savingsAccount) await assertOwnAccounts(ds.manager, userId, [input.savingsAccount as never], "savingsAccount");

  const repo = await getRepo("UserSettings");
  // upsert = INSERT, or UPDATE if this user already has a row
  await repo.upsert({ userId, ...next }, ["userId"]);
  return next;
}
