import { Text } from "react-native";
import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";
import { useTranslation } from "@/lib/i18n";

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text className={`text-xl ${focused ? "" : "opacity-40"}`}>{glyph}</Text>
  );
}

export default function DriverLayout() {
  const { t } = useTranslation();

  return (
    <AuthGuard>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#7c3aed",
        tabBarLabelStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("driver.tabOrders"),
          tabBarIcon: (p) => <TabIcon glyph="📦" focused={p.focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("driver.tabHistory"),
          tabBarIcon: (p) => <TabIcon glyph="🧾" focused={p.focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("driver.tabAccount"),
          tabBarIcon: (p) => <TabIcon glyph="👤" focused={p.focused} />,
        }}
      />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
    </Tabs>
    </AuthGuard>
  );
}
