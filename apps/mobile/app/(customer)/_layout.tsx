import { Text } from "react-native";
import { Tabs } from "expo-router";

import { useTranslation } from "@/lib/i18n";
import { useCart } from "@/lib/cart-store";

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text className={`text-xl ${focused ? "" : "opacity-40"}`}>{glyph}</Text>
  );
}

export default function CustomerLayout() {
  const { t } = useTranslation();
  const cartCount = useCart((s) => s.lines.length);

  return (
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
          title: t("shop.tabHome"),
          tabBarIcon: (p) => <TabIcon glyph="🏠" focused={p.focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("shop.tabSearch"),
          tabBarIcon: (p) => <TabIcon glyph="🔍" focused={p.focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t("shop.tabCart"),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: (p) => <TabIcon glyph="🛒" focused={p.focused} />,
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: t("shop.tabOrders"),
          tabBarIcon: (p) => <TabIcon glyph="📦" focused={p.focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("shop.tabAccount"),
          tabBarIcon: (p) => <TabIcon glyph="👤" focused={p.focused} />,
        }}
      />
      <Tabs.Screen name="category/[id]" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
    </Tabs>
  );
}
