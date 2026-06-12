import { db } from "@workspace/db/client";

import { getWhatsAppConfig, type WhatsAppConfig } from "./config";
import { sendTwilioText } from "./twilio";
import { sendText } from "./wapilot";

/** "+201001234567" → "201001234567@c.us" (Wapilot chat id format). */
export function phoneToChatId(phoneE164: string): string {
  return `${phoneE164.replace(/[^0-9]/g, "")}@c.us`;
}

/**
 * Send a WhatsApp message using a pre-loaded config.
 * Callers that already have a db instance should call getWhatsAppConfig(db)
 * once and reuse the result for multiple sends.
 */
export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  phoneE164: string,
  text: string,
): Promise<void> {
  if (config.provider === "wapilot") {
    await sendText({
      instanceId: config.instanceId,
      token: config.token,
      params: { chat_id: phoneToChatId(phoneE164), text },
    });
    return;
  }

  if (config.provider === "twilio") {
    await sendTwilioText(
      config.accountSid,
      config.authToken,
      config.fromNumber,
      phoneE164,
      text,
    );
    return;
  }

  // console provider — log so OTP codes are visible during local dev/testing
  console.log(`[whatsapp:console] to ${phoneE164}:\n${text}`);
}

/**
 * Convenience wrapper — loads config from DB on each call.
 * Use sendWhatsAppMessage(config, ...) directly when you already have a db.
 */
export async function sendWhatsAppText(
  phoneE164: string,
  text: string,
): Promise<void> {
  const config = await getWhatsAppConfig(db);
  await sendWhatsAppMessage(config, phoneE164, text);
}
