import { type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { HIDDEN_TAB_BAR, useTabBarScreenOptions } from "@/components/ui/tab-bar";
import { useTranslation } from "@/lib/i18n";
import { useCart } from "@/lib/cart-store";

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function CustomerLayout() {
  const { t } = useTranslation();
  const cartCount = useCart((s) => s.lines.length);
  const screenOptions = useTabBarScreenOptions();

  return (
    <Tabs screenOptions={screenOptions}>
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
      <Tabs.Screen name="orders/[id]" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="checkout" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="addresses" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="terms" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="privacy" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
    </Tabs>
  );
}
