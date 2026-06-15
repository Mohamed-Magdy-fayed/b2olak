import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { StatusChip } from "@/components/ui/status-chip";
import { useSignedIn } from "@/lib/auth-gate";
import { useTranslation } from "@/lib/i18n";
import { useTabBarHeight } from "@/lib/use-tab-bar-height";
import { useTRPC } from "@/lib/trpc";

const ACTIVE = ["placed", "assigned", "shopping", "purchased", "delivering"];

export default function OrdersScreen() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const signedIn = useSignedIn();
  const tabBarHeight = useTabBarHeight();

  const { data } = useQuery({
    ...trpc.orders.mine.queryOptions({ cursor: 0 }),
    refetchInterval: 15_000,
    enabled: signedIn === true,
  });

  if (signedIn === false) {
    return (
      <Screen className="items-center justify-center gap-4">
        <Text className="text-center font-display text-xl text-foreground">
          {t("shop.guestOrdersTitle")}
        </Text>
        <Text className="text-center text-muted-foreground">
          {t("shop.guestOrdersSubtitle")}
        </Text>
        <Button
          label={t("shop.signInCta")}
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </Screen>
    );
  }

  const orders = [...(data?.orders ?? [])].sort((a, b) => {
    const aActive = ACTIVE.includes(a.status) ? 0 : 1;
    const bActive = ACTIVE.includes(b.status) ? 0 : 1;
    return aActive - bActive;
  });

  return (
    <Screen padded={false}>
      <ScreenHeader title={t("shop.ordersTitle")} className="px-5" />
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBarHeight + 16 }}
        renderItem={({ item: order }) => (
          <Pressable
            className="mb-3 rounded-2xl border border-border bg-card p-4 active:bg-elevated"
            onPress={() => router.push(`/(customer)/orders/${order.id}`)}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">
                {t("shop.orderNumber", { number: String(order.orderNumber) })}
              </Text>
              <StatusChip status={order.status} />
            </View>
            <Text className="mt-1.5 text-sm text-muted-foreground">
              {order.items.length} • {new Date(order.createdAt).toLocaleDateString()}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text className="py-12 text-center text-muted-foreground">
            {t("shop.noOrders")}
          </Text>
        }
      />
    </Screen>
  );
}
