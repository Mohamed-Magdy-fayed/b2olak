import { type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AuthGuard } from "@/components/auth-guard";
import { useTranslation } from "@/lib/i18n";

const GOLD = "#C9A227";
const MUTED = "#9B968C";

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function DriverLayout() {
  const { t } = useTranslation();

  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: GOLD,
          tabBarInactiveTintColor: MUTED,
          tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
          tabBarStyle: {
            backgroundColor: "#161619",
            borderTopColor: "#2A2A2E",
            borderTopWidth: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t("driver.tabOrders"), tabBarIcon: tabIcon("cube-outline") }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: t("driver.tabHistory"), tabBarIcon: tabIcon("receipt-outline") }}
        />
        <Tabs.Screen
          name="account"
          options={{ title: t("driver.tabAccount"), tabBarIcon: tabIcon("person-outline") }}
        />
        <Tabs.Screen name="orders/[id]" options={{ href: null }} />
      </Tabs>
    </AuthGuard>
  );
}
