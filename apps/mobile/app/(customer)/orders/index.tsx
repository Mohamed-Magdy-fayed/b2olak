import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

const ACTIVE = ["placed", "assigned", "shopping", "purchased", "delivering"];

export function StatusChip({ status }: { status: string }) {
  const { t } = useTranslation();
  const tone = ACTIVE.includes(status)
    ? "bg-primary/10 text-primary"
    : status === "delivered"
      ? "bg-success/10 text-success"
      : "bg-muted text-muted-foreground";
  return (
    <View className={`rounded-full px-3 py-1 ${tone.split(" ")[0]}`}>
      <Text className={`text-xs font-semibold ${tone.split(" ")[1]}`}>
        {t(`shop.status.${status}` as never)}
      </Text>
    </View>
  );
}

export default function OrdersScreen() {
  const trpc = useTRPC();
  const { t } = useTranslation();

  const { data } = useQuery({
    ...trpc.orders.mine.queryOptions({ cursor: 0 }),
    refetchInterval: 15_000,
  });

  const orders = [...(data?.orders ?? [])].sort((a, b) => {
    const aActive = ACTIVE.includes(a.status) ? 0 : 1;
    const bActive = ACTIVE.includes(b.status) ? 0 : 1;
    return aActive - bActive;
  });

  return (
    <View className="flex-1 bg-background px-4 pt-16">
      <Text className="mb-3 text-2xl font-black text-foreground">
        {t("shop.ordersTitle")}
      </Text>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        renderItem={({ item: order }) => (
          <Pressable
            className="mb-3 rounded-xl border border-border bg-card p-4 active:bg-muted"
            onPress={() => router.push(`/(customer)/orders/${order.id}`)}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">
                {t("shop.orderNumber", { number: String(order.orderNumber) })}
              </Text>
              <StatusChip status={order.status} />
            </View>
            <Text className="mt-1 text-sm text-muted-foreground">
              {order.items.length} • {new Date(order.createdAt).toLocaleDateString()}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text className="py-12 text-center text-muted-foreground">
            {t("shop.noOrders")}
          </Text>
        }
        contentContainerClassName="pb-6"
      />
    </View>
  );
}
