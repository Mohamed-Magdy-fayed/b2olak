import { FlatList, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function DriverHistory() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { data } = useQuery(trpc.driver.myOrders.queryOptions());

  return (
    <View className="flex-1 bg-background px-4 pt-16">
      <Text className="mb-3 text-2xl font-black text-foreground">
        {t("driver.history")}
      </Text>

      <Card className="mb-4 p-4">
        <Text className="font-bold text-foreground">
          {t("driver.todayRecap", {
            count: String(data?.today.delivered ?? 0),
            cod: String(data?.today.cod ?? 0),
          })}
        </Text>
      </Card>

      <FlatList
        data={data?.history ?? []}
        keyExtractor={(o) => o.id}
        renderItem={({ item: order }) => (
          <View className="mb-3 flex-row items-center justify-between rounded-xl border border-border bg-card p-4">
            <View>
              <Text className="font-bold text-foreground">
                {t("shop.orderNumber", { number: String(order.orderNumber) })}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {t(`shop.status.${order.status}` as never)} •{" "}
                {new Date(order.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text className="font-bold text-primary">
              {order.codTotal ? `${order.codTotal} EGP` : "—"}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text className="py-12 text-center text-muted-foreground">
            {t("admin.common.noResults")}
          </Text>
        }
        contentContainerClassName="pb-6"
      />
    </View>
  );
}
