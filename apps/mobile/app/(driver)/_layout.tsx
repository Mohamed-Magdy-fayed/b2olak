import { type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGuard } from "@/components/auth-guard";
import { useTranslation } from "@/lib/i18n";

const GOLD = "#C9A227";
const MUTED = "#9B968C";
// Breathing room below the tab label so it doesn't hug the bottom edge on
// devices without a home indicator (where insets.bottom is 0).
const TAB_BAR_GAP = 12;

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function DriverLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: GOLD,
          tabBarInactiveTintColor: MUTED,
          tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
          // Pin the bar to the bottom edge (covers the home-indicator safe area).
          tabBarStyle: {
            backgroundColor: "#161619",
            borderTopColor: "#2A2A2E",
            borderTopWidth: 1,
            height: 56 + insets.bottom + TAB_BAR_GAP,
            paddingBottom: insets.bottom + TAB_BAR_GAP,
            paddingTop: 6,
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
