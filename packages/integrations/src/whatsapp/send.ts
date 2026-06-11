import { sendText } from "./wapilot";

/**
 * High-level WhatsApp sender.
 * Dev fallback: when Wapilot env vars are missing OUTSIDE production, the
 * message is logged to the server console instead (lets you test OTP flows
 * without a Wapilot account). In production missing env is a hard error.
 */

/** "+201001234567" → "201001234567@c.us" (Wapilot chat id format). */
export function phoneToChatId(phoneE164: string): string {
  return `${phoneE164.replace(/[^0-9]/g, "")}@c.us`;
}

export async function sendWhatsAppText(phoneE164: string, text: string) {
  const instanceId = process.env.WAPILOT_INSTANCE_ID;
  const token = process.env.WAPILOT_API_TOKEN;

  if (!instanceId || !token) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "WAPILOT_INSTANCE_ID / WAPILOT_API_TOKEN are not set in production.",
      );
    }
    console.warn(
      `[whatsapp:dev-fallback] to ${phoneE164}:\n${text}\n(set WAPILOT_* env vars to send real messages)`,
    );
    return;
  }

  await sendText({
    instanceId,
    token,
    params: { chat_id: phoneToChatId(phoneE164), text },
  });
}
