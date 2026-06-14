import { type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "@/lib/i18n";
import { useCart } from "@/lib/cart-store";

const GOLD = "#C9A227";
const MUTED = "#9B968C";

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function CustomerLayout() {
  const { t } = useTranslation();
  const cartCount = useCart((s) => s.lines.length);

  return (
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
        tabBarBadgeStyle: { backgroundColor: GOLD, color: "#0E0E10" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t("shop.tabHome"), tabBarIcon: tabIcon("home-outline") }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: t("shop.tabSearch"), tabBarIcon: tabIcon("search-outline") }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t("shop.tabCart"),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: tabIcon("bag-handle-outline"),
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{ title: t("shop.tabOrders"), tabBarIcon: tabIcon("receipt-outline") }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t("shop.tabAccount"), tabBarIcon: tabIcon("person-outline") }}
      />
      <Tabs.Screen name="category/[id]" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
    </Tabs>
  );
}
