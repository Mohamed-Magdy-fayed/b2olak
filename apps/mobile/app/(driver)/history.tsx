import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { OrderListSkeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function DriverHistory() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useQuery({
    ...trpc.driver.myOrders.queryOptions(),
    // Completed orders don't change; avoid refetching on every tab focus.
    staleTime: 5 * 60 * 1000,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isError) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t("driver.history")} className="px-4" />
        <View className="items-center gap-4 py-16">
          <Ionicons name="alert-circle-outline" size={40} color="#F0584F" />
          <Text className="text-center text-destructive">
            {t("common.error")}
          </Text>
          <Pressable
            className="rounded-2xl bg-primary px-6 py-3 active:opacity-80"
            onPress={() => void refetch()}
          >
            <Text className="font-semibold text-primary-foreground">
              {t("common.retry")}
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const header = (
    <>
      <ScreenHeader title={t("driver.history")} />

      {/* today's recap */}
      <Card className="mb-4 gap-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name="stats-chart-outline" size={16} color="#C9A227" />
          <Text className="font-semibold text-foreground">
            {t("driver.todayRecap", {
              count: String(data?.today.delivered ?? 0),
              cod: String(data?.today.cod ?? 0),
            })}
          </Text>
        </View>
        <View className="flex-row gap-4">
          <View className="flex-1 items-center rounded-xl bg-elevated py-3">
            <Text className="font-display text-2xl text-primary">
              {data?.today.delivered ?? 0}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {t("driver.activeOrders")}
            </Text>
          </View>
          <View className="flex-1 items-center rounded-xl bg-elevated py-3">
            <Text className="font-display text-2xl text-primary">
              {data?.today.cod ?? 0}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">EGP</Text>
          </View>
        </View>
      </Card>

      {isLoading ? <OrderListSkeleton count={4} /> : null}
    </>
  );

  return (
    <Screen padded={false}>
      <FlatList
        className="flex-1 px-4"
        data={isLoading ? [] : (data?.history ?? [])}
        keyExtractor={(o) => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#C9A227"
            colors={["#C9A227"]}
          />
        }
        renderItem={({ item: order }) => (
          <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <View className="flex-1 gap-1">
              <Text className="font-display text-base text-foreground">
                {t("shop.orderNumber", {
                  number: String(order.orderNumber),
                })}
              </Text>
              <View className="flex-row items-center gap-2">
                <StatusChip status={order.status} />
                <Text className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Text className="font-display text-base text-primary">
              {order.codTotal ? `${order.codTotal} EGP` : "—"}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center gap-3 py-16">
              <Ionicons name="receipt-outline" size={40} color="#9B968C" />
              <Text className="text-center text-muted-foreground">
                {t("admin.common.noResults")}
              </Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
