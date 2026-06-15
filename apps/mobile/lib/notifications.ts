import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
// Type-only import: erased at compile time, so it does NOT load the native
// module at runtime (which is what throws in Expo Go on SDK 53+).
import type * as NotificationsModule from "expo-notifications";

/**
 * Expo Go (the shared sandbox app) dropped the native remote-push module in
 * SDK 53, and simply *importing* `expo-notifications` throws there at load
 * time. So we never statically import it — we lazy-`require` it only when we
 * are NOT in Expo Go (i.e. in a development or production build).
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** EAS project id — required by the Expo push service to mint a token. */
const projectId = Constants.expoConfig?.extra?.eas?.projectId as
  | string
  | undefined;

let cached: typeof NotificationsModule | null = null;

/** Loads expo-notifications lazily, or returns null inside Expo Go. */
function loadNotifications(): typeof NotificationsModule | null {
  if (isExpoGo) return null;
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-notifications") as typeof NotificationsModule;
  }
  return cached;
}

export function setupNotificationHandler() {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Returns the device's Expo push token, or `null` when push isn't available
 * (Expo Go, simulator, permission denied, or any failure). Never throws — a
 * missing token simply means the caller skips registration.
 */
export async function getExpoPushToken(): Promise<string | null> {
  const Notifications = loadNotifications();

  if (!Notifications || !Device.isDevice || !projectId) {
    if (isExpoGo && __DEV__) {
      console.info(
        "[notifications] Skipping push in Expo Go — use a development build to test push.",
      );
    }
    return null;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const finalStatus =
      existing === "granted"
        ? existing
        : (await Notifications.requestPermissionsAsync()).status;

    if (finalStatus !== "granted") return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#C9A227",
      });
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    if (__DEV__) {
      console.warn("[notifications] Failed to get push token:", error);
    }
    return null;
  }
}
