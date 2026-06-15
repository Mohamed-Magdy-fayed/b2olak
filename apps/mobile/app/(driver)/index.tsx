import { FlatList, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { Card } from "@/components/ui/card";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { StatusChip } from "@/components/ui/status-chip";
import { useTranslation } from "@/lib/i18n";
import { useTabBarHeight } from "@/lib/use-tab-bar-height";
import { useTRPC } from "@/lib/trpc";

export default function DriverHome() {
  const tabBarHeight = useTabBarHeight();
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
      <Screen>
        <View className="flex-1 items-center justify-center gap-4">
          <Card className="w-full items-center gap-3 border border-warning p-6">
            <Ionicons name="time-outline" size={40} color="#C9A227" />
            <Text className="font-display text-2xl text-foreground">
              {t("mobile.driverPendingTitle")}
            </Text>
            <Text className="text-center text-muted-foreground">
              {t("mobile.driverPendingBody")}
            </Text>
          </Card>
        </View>
      </Screen>
    );
  }

  const isAvailable = me?.driverProfile?.isAvailable ?? false;

  return (
    <Screen padded={false}>
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      >
        <ScreenHeader
          title={t("mobile.welcomeTitle")}
          right={<LanguageToggle />}
        />

        {/* Availability toggle */}
        <Card className="mb-4 flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2">
            <View
              className={`size-2.5 rounded-full ${isAvailable ? "bg-success" : "bg-muted-foreground"}`}
            />
            <Text
              className={`text-base font-semibold ${
                isAvailable ? "text-success" : "text-muted-foreground"
              }`}
            >
              {isAvailable ? t("driver.available") : t("driver.unavailable")}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            disabled={setAvailability.isPending}
            onValueChange={(value) => setAvailability.mutate({ isAvailable: value })}
            trackColor={{ false: "#3A3A3C", true: "#C9A227" }}
            thumbColor="#F5F2EC"
          />
        </Card>

        <Text className="mb-3 font-display text-lg text-foreground">
          {t("driver.activeOrders")}
        </Text>

        <FlatList
          data={data?.active ?? []}
          keyExtractor={(o) => o.id}
          scrollEnabled={false}
          renderItem={({ item: order }) => (
            <Pressable
              className="mb-3 rounded-2xl border border-border bg-card p-4 active:bg-elevated"
              onPress={() => router.push(`/(driver)/orders/${order.id}`)}
            >
              <View className="mb-2 flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-display text-base text-foreground">
                  {t("shop.orderNumber", { number: String(order.orderNumber) })}
                </Text>
                <StatusChip status={order.status} />
              </View>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="location-outline" size={14} color="#9B968C" />
                <Text className="flex-1 text-sm text-muted-foreground" numberOfLines={1}>
                  {t("driver.orderFor", { area: order.area })} •{" "}
                  {t("driver.itemsCount", { count: String(order.items.length) })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#9B968C" />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center gap-3 py-16">
              <Ionicons name="bag-outline" size={40} color="#9B968C" />
              <Text className="text-center text-muted-foreground">
                {t("driver.noActive")}
              </Text>
            </View>
          }
        />
      </ScrollView>
    </Screen>
  );
}
