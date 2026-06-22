import { type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "@/lib/i18n";
import { useCart } from "@/lib/cart-store";

const GOLD = "#C9A227";
const MUTED = "#9B968C";
// Breathing room below the tab label so it doesn't hug the bottom edge on
// devices without a home indicator (where insets.bottom is 0).
const TAB_BAR_GAP = 8;

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function CustomerLayout() {
  const { t } = useTranslation();
  const cartCount = useCart((s) => s.lines.length);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
        // Pin the bar to the bottom edge: its background fills the home-indicator
        // safe area and the labels sit above it, instead of floating up the screen.
        tabBarStyle: {
          backgroundColor: "#161619",
          borderTopColor: "#2A2A2E",
          borderTopWidth: 1,
          height: 56 + insets.bottom + TAB_BAR_GAP,
          paddingBottom: insets.bottom + TAB_BAR_GAP,
          paddingTop: 6,
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
      <Tabs.Screen name="terms" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
    </Tabs>
  );
}
