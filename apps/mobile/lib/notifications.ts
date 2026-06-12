import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

const PROJECT_ID = "f049e11e-a944-4907-9f19-1a97b3650d3f";

export function setupNotificationHandler() {
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

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

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
      lightColor: "#7c3aed",
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
  return token.data;
}
