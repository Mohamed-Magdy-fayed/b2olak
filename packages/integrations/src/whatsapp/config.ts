import "server-only";

import { eq } from "drizzle-orm";

import type { Db } from "@workspace/db/client";
import { ProviderConfigTable } from "@workspace/db/schemas/system/provider-config";

import { decryptCredential } from "./crypto";

export type WhatsAppProvider = "wapilot" | "twilio" | "console";

export type WhatsAppConfig =
  | { provider: "wapilot"; instanceId: string; token: string }
  | {
      provider: "twilio";
      accountSid: string;
      authToken: string;
      fromNumber: string;
    }
  | { provider: "console" };

export const PROVIDER_CONFIG_KEYS = {
  whatsappProvider: "whatsapp_provider",
  wapilotInstanceId: "whatsapp_wapilot_instance_id",
  wapilotApiToken: "whatsapp_wapilot_api_token",
  twilioAccountSid: "whatsapp_twilio_account_sid",
  twilioAuthToken: "whatsapp_twilio_auth_token",
  twilioFromNumber: "whatsapp_twilio_from_number",
} as const;

async function getConfigRow(db: Db, key: string): Promise<string | null> {
  const row = await db.query.ProviderConfigTable.findFirst({
    where: eq(ProviderConfigTable.key, key),
  });
  return row?.value ?? null;
}

/**
 * Loads the active WhatsApp provider config from the DB.
 * Falls back to WAPILOT_* env vars if no DB setting exists (backward compat).
 * Final fallback: console mode in non-production; throws in production.
 */
export async function getWhatsAppConfig(db: Db): Promise<WhatsAppConfig> {
  const provider = await getConfigRow(db, PROVIDER_CONFIG_KEYS.whatsappProvider);

  if (!provider) {
    // Backward compat: use env vars if no DB setting has been saved yet.
    const instanceId = process.env.WAPILOT_INSTANCE_ID;
    const token = process.env.WAPILOT_API_TOKEN;
    if (instanceId && token) return { provider: "wapilot", instanceId, token };

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "WhatsApp provider is not configured. Set it in the admin settings.",
      );
    }
    console.warn(
      "[whatsapp] No provider configured — falling back to console mode.",
    );
    return { provider: "console" };
  }

  if (provider === "console") return { provider: "console" };

  if (provider === "wapilot") {
    const [rawInstanceId, rawToken] = await Promise.all([
      getConfigRow(db, PROVIDER_CONFIG_KEYS.wapilotInstanceId),
      getConfigRow(db, PROVIDER_CONFIG_KEYS.wapilotApiToken),
    ]);
    const instanceId = rawInstanceId ? decryptCredential(rawInstanceId) : null;
    const token = rawToken ? decryptCredential(rawToken) : null;
    if (!instanceId || !token) {
      // Decryption can fail when the DB was written with a different
      // SETTINGS_ENCRYPTION_KEY (e.g. dev env sharing a prod DB). Try env
      // vars before giving up so local development still sends real messages.
      const envInstanceId = process.env.WAPILOT_INSTANCE_ID;
      const envToken = process.env.WAPILOT_API_TOKEN;
      if (envInstanceId && envToken) {
        console.warn("[whatsapp:config] DB credentials unreadable — using WAPILOT_* env vars.");
        return { provider: "wapilot", instanceId: envInstanceId, token: envToken };
      }
      console.warn("[whatsapp] Wapilot credentials missing/invalid — falling back to console.");
      return { provider: "console" };
    }
    return { provider: "wapilot", instanceId, token };
  }

  if (provider === "twilio") {
    const [rawSid, rawAuth, fromNumber] = await Promise.all([
      getConfigRow(db, PROVIDER_CONFIG_KEYS.twilioAccountSid),
      getConfigRow(db, PROVIDER_CONFIG_KEYS.twilioAuthToken),
      getConfigRow(db, PROVIDER_CONFIG_KEYS.twilioFromNumber),
    ]);
    const accountSid = rawSid ? decryptCredential(rawSid) : null;
    const authToken = rawAuth ? decryptCredential(rawAuth) : null;
    if (!accountSid || !authToken || !fromNumber) {
      console.warn("[whatsapp] Twilio credentials missing/invalid — falling back to console.");
      return { provider: "console" };
    }
    return { provider: "twilio", accountSid, authToken, fromNumber };
  }

  console.warn(`[whatsapp] Unknown provider "${provider}" — falling back to console.`);
  return { provider: "console" };
}
