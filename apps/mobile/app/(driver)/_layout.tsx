import { type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AuthGuard } from "@/components/auth-guard";
import { HIDDEN_TAB_BAR, useTabBarScreenOptions } from "@/components/ui/tab-bar";
import { useTranslation } from "@/lib/i18n";

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function DriverLayout() {
  const { t } = useTranslation();
  const screenOptions = useTabBarScreenOptions();

  return (
    <AuthGuard>
      <Tabs screenOptions={screenOptions}>
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
        <Tabs.Screen name="orders/[id]" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      </Tabs>
    </AuthGuard>
  );
}
