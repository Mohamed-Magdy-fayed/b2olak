import { eq } from "drizzle-orm";

import type { Db } from "@workspace/db/client";
import { ProviderConfigTable } from "@workspace/db/schemas/system/provider-config";
import { SystemSettingsTable } from "@workspace/db/schemas/system/system-settings";
import {
  PROVIDER_CONFIG_KEYS,
  type WhatsAppProvider,
} from "@workspace/integrations/whatsapp/config";
import {
  decryptCredential,
  encryptCredential,
} from "@workspace/integrations/whatsapp/crypto";
import type { whatsappSettingsUpdateSchema } from "@workspace/validators/catalog";
import type { z } from "zod";

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

// ── Provider config helpers ──────────────────────────────────────────────────

async function getProviderConfigRow(db: Db, key: string): Promise<string | null> {
  const row = await db.query.ProviderConfigTable.findFirst({
    where: eq(ProviderConfigTable.key, key),
  });
  return row?.value ?? null;
}

async function upsertProviderConfig(
  db: Db,
  key: string,
  value: string,
  actorId: string,
) {
  await db
    .insert(ProviderConfigTable)
    .values({ key, value, createdBy: actorId })
    .onConflictDoUpdate({
      target: ProviderConfigTable.key,
      set: { value, updatedBy: actorId },
    });
}

export async function getWhatsAppProvider(
  db: Db,
): Promise<WhatsAppProvider | null> {
  const value = await getProviderConfigRow(
    db,
    PROVIDER_CONFIG_KEYS.whatsappProvider,
  );
  if (value === "wapilot" || value === "twilio" || value === "console") {
    return value;
  }
  return null;
}

export async function getWhatsAppCredentialsMasked(db: Db): Promise<{
  wapilot: { configured: boolean };
  twilio: { configured: boolean };
}> {
  const [wapilotInstance, wapilotToken, twilioSid, twilioAuth] =
    await Promise.all([
      getProviderConfigRow(db, PROVIDER_CONFIG_KEYS.wapilotInstanceId),
      getProviderConfigRow(db, PROVIDER_CONFIG_KEYS.wapilotApiToken),
      getProviderConfigRow(db, PROVIDER_CONFIG_KEYS.twilioAccountSid),
      getProviderConfigRow(db, PROVIDER_CONFIG_KEYS.twilioAuthToken),
    ]);

  return {
    wapilot: {
      configured:
        !!(wapilotInstance && decryptCredential(wapilotInstance)) &&
        !!(wapilotToken && decryptCredential(wapilotToken)),
    },
    twilio: {
      configured:
        !!(twilioSid && decryptCredential(twilioSid)) &&
        !!(twilioAuth && decryptCredential(twilioAuth)),
    },
  };
}

export async function upsertWhatsappConfig(
  db: Db,
  input: z.infer<typeof whatsappSettingsUpdateSchema>,
  actorId: string,
): Promise<void> {
  await upsertProviderConfig(
    db,
    PROVIDER_CONFIG_KEYS.whatsappProvider,
    input.provider,
    actorId,
  );

  if (input.wapilot) {
    await Promise.all([
      upsertProviderConfig(
        db,
        PROVIDER_CONFIG_KEYS.wapilotInstanceId,
        encryptCredential(input.wapilot.instanceId),
        actorId,
      ),
      upsertProviderConfig(
        db,
        PROVIDER_CONFIG_KEYS.wapilotApiToken,
        encryptCredential(input.wapilot.token),
        actorId,
      ),
    ]);
  }

  if (input.twilio) {
    await Promise.all([
      upsertProviderConfig(
        db,
        PROVIDER_CONFIG_KEYS.twilioAccountSid,
        encryptCredential(input.twilio.accountSid),
        actorId,
      ),
      upsertProviderConfig(
        db,
        PROVIDER_CONFIG_KEYS.twilioAuthToken,
        encryptCredential(input.twilio.authToken),
        actorId,
      ),
      upsertProviderConfig(
        db,
        PROVIDER_CONFIG_KEYS.twilioFromNumber,
        input.twilio.fromNumber,
        actorId,
      ),
    ]);
  }
}
