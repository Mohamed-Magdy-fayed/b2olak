import { FlatList, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { StatusChip } from "@/components/ui/status-chip";
import { useTranslation } from "@/lib/i18n";
import { useTabBarHeight } from "@/lib/use-tab-bar-height";
import { useTRPC } from "@/lib/trpc";

export default function DriverHistory() {
  const tabBarHeight = useTabBarHeight();
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { data } = useQuery(trpc.driver.myOrders.queryOptions());

  return (
    <Screen padded={false}>
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      >
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

        <FlatList
          data={data?.history ?? []}
          keyExtractor={(o) => o.id}
          scrollEnabled={false}
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
            <View className="items-center gap-3 py-16">
              <Ionicons name="receipt-outline" size={40} color="#9B968C" />
              <Text className="text-center text-muted-foreground">
                {t("admin.common.noResults")}
              </Text>
            </View>
          }
        />
      </ScrollView>
    </Screen>
  );
}
