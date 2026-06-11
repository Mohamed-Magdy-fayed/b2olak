import { FlatList, Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function DriverHome() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: me } = useQuery(trpc.auth.me.queryOptions());
  const approved = me?.driverProfile?.status === "approved";

  const ordersOptions = trpc.driver.myOrders.queryOptions();
  const { data } = useQuery({
    ...ordersOptions,
    enabled: approved,
    refetchInterval: 10_000,
  });

  const setAvailability = useMutation(
    trpc.driver.setAvailability.mutationOptions({
      onSuccess: () =>
        void queryClient.invalidateQueries({
          queryKey: trpc.auth.me.queryKey(),
        }),
    }),
  );

  if (me && !approved) {
    return (
      <View className="flex-1 justify-center gap-4 bg-background p-6">
        <Card className="items-center gap-2 border-warning p-6">
          <Text className="text-2xl font-bold text-foreground">
            {t("mobile.driverPendingTitle")}
          </Text>
          <Text className="text-center text-muted-foreground">
            {t("mobile.driverPendingBody")}
          </Text>
        </Card>
      </View>
    );
  }

  const isAvailable = me?.driverProfile?.isAvailable ?? false;

  return (
    <View className="flex-1 bg-background px-4 pt-16">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-black text-primary">
          {t("mobile.welcomeTitle")}
        </Text>
        <LanguageToggle />
      </View>

      <Card className="mb-4 flex-row items-center justify-between p-4">
        <Text
          className={`text-base font-bold ${
            isAvailable ? "text-success" : "text-muted-foreground"
          }`}
        >
          {isAvailable ? t("driver.available") : t("driver.unavailable")}
        </Text>
        <Switch
          value={isAvailable}
          disabled={setAvailability.isPending}
          onValueChange={(value) => setAvailability.mutate({ isAvailable: value })}
          trackColor={{ true: "#7c3aed" }}
        />
      </Card>

      <Text className="mb-2 text-lg font-bold text-foreground">
        {t("driver.activeOrders")}
      </Text>
      <FlatList
        data={data?.active ?? []}
        keyExtractor={(o) => o.id}
        renderItem={({ item: order }) => (
          <Pressable
            className="mb-3 rounded-xl border border-border bg-card p-4 active:bg-muted"
            onPress={() => router.push(`/(driver)/orders/${order.id}`)}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">
                {t("shop.orderNumber", { number: String(order.orderNumber) })}
              </Text>
              <Text className="text-sm font-semibold text-primary">
                {t(`shop.status.${order.status}` as never)}
              </Text>
            </View>
            <Text className="mt-1 text-sm text-muted-foreground">
              {t("driver.orderFor", { area: order.area })} •{" "}
              {t("driver.itemsCount", { count: String(order.items.length) })}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text className="py-12 text-center text-muted-foreground">
            {t("driver.noActive")}
          </Text>
        }
        contentContainerClassName="pb-6"
      />
    </View>
  );
}
