import "server-only";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Sends an Expo push notification. Silently no-ops if the token is missing or
 * not an Expo token (e.g. recipient hasn't installed the app yet).
 *
 * NEVER throws: a push failure must not bubble into the Inngest step that also
 * sends the WhatsApp message, or a failed/expired push token would force the
 * whole step to retry and re-send WhatsApp. Instead we check the HTTP status
 * and the Expo ticket, and log any error so prod push failures are visible
 * (e.g. DeviceNotRegistered, MismatchSenderId → FCM credentials misconfigured).
 */
export async function sendExpoPush(
  to: string | null | undefined,
  message: PushMessage,
): Promise<void> {
  if (!to?.startsWith("ExponentPushToken[")) return;

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, sound: "default", ...message }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(
        `[expo-push] HTTP ${response.status} for ${to}: ${body.slice(0, 500)}`,
      );
      return;
    }

    // Expo always returns 200 with a per-message ticket; a delivery problem
    // shows up as data.status === "error" (not as a non-2xx).
    const json = (await response.json().catch(() => null)) as {
      data?: { status?: string; message?: string; details?: unknown };
    } | null;
    const ticket = json?.data;
    if (ticket?.status === "error") {
      console.warn(
        `[expo-push] ticket error for ${to}: ${ticket.message ?? "unknown"}`,
        ticket.details ?? "",
      );
    }
  } catch (error) {
    console.warn(`[expo-push] send failed for ${to}:`, error);
  }
}
