import { eq } from "drizzle-orm";

import type { Db } from "@workspace/db/client";
import { SystemSettingsTable } from "@workspace/db/schemas/system/system-settings";

export const SETTING_KEYS = {
  deliveryFee: "delivery_fee_egp",
  supportWhatsapp: "support_whatsapp_number",
} as const;

export async function getDeliveryFeeEgp(db: Db): Promise<number> {
  const row = await db.query.SystemSettingsTable.findFirst({
    where: eq(SystemSettingsTable.key, SETTING_KEYS.deliveryFee),
  });
  const amount = (row?.value as { amount?: number } | null)?.amount;
  return typeof amount === "number" ? amount : 25;
}

export async function getSupportWhatsapp(db: Db): Promise<string> {
  const row = await db.query.SystemSettingsTable.findFirst({
    where: eq(SystemSettingsTable.key, SETTING_KEYS.supportWhatsapp),
  });
  const value = (row?.value as { value?: string } | null)?.value;
  return value ?? "";
}

export async function upsertSetting(
  db: Db,
  key: string,
  value: unknown,
  updatedBy: string,
) {
  await db
    .insert(SystemSettingsTable)
    .values({ key, value, createdBy: updatedBy })
    .onConflictDoUpdate({
      target: SystemSettingsTable.key,
      set: { value, updatedBy },
    });
}
