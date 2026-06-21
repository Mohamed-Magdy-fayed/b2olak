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
 */
export async function sendExpoPush(
  to: string | null | undefined,
  message: PushMessage,
): Promise<void> {
  if (!to?.startsWith("ExponentPushToken[")) return;
  await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, sound: "default", ...message }),
  });
}
