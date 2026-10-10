import type { EntityManager } from "typeorm";
import { getDataSource, getRepo } from "@/lib/db/data-source";
import type { UserSettings } from "@/lib/db/entities/UserSettings";
import type { SettingsInput } from "@/lib/income-input";

export type SettingsDTO = { sadqaPercent: number };

// Users who never opened Settings have no row yet: that means 0%.
export async function readSettings(m: EntityManager, userId: string): Promise<SettingsDTO> {
  const row = await m.getRepository<UserSettings>("UserSettings").findOne({ where: { userId } });
  return { sadqaPercent: row?.sadqaPercent ?? 0 };
}

export async function getSettings(userId: string): Promise<SettingsDTO> {
  const ds = await getDataSource();
  return readSettings(ds.manager, userId);
}

export async function updateSettings(userId: string, input: SettingsInput): Promise<SettingsDTO> {
  const repo = await getRepo("UserSettings");
  // upsert = INSERT, or UPDATE if this user already has a row
  await repo.upsert({ userId, sadqaPercent: input.sadqaPercent }, ["userId"]);
  return { sadqaPercent: input.sadqaPercent };
}
