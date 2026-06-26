import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { OrderListSkeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { useSignedIn } from "@/lib/auth-gate";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

const ACTIVE = ["placed", "assigned", "shopping", "purchased", "delivering"];

export default function OrdersScreen() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const signedIn = useSignedIn();

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.orders.mine.queryOptions({ cursor: 0 }),
    // Only poll while something is in-flight; idle lists stop refetching.
    refetchInterval: (query) =>
      query.state.data?.orders.some((o) => ACTIVE.includes(o.status))
        ? 15_000
        : false,
    enabled: signedIn === true,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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

  if (error) {
    return (
      <Screen className="items-center justify-center gap-4">
        <Text className="text-center text-foreground">{t("common.error")}</Text>
        <Button label={t("common.retry")} onPress={() => void refetch()} />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t("shop.ordersTitle")} className="px-4" />
        <View className="px-5">
          <OrderListSkeleton count={5} />
        </View>
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
      <ScreenHeader title={t("shop.ordersTitle")} className="px-4" />
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#C9A227"
            colors={["#C9A227"]}
          />
        }
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
