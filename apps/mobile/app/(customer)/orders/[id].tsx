import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen, ScreenBackHeader } from "@/components/ui/screen";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

const ACTIVE = ["placed", "assigned", "shopping", "purchased", "delivering"];
const TIMELINE = [
  "placed",
  "assigned",
  "shopping",
  "purchased",
  "delivering",
  "delivered",
] as const;

export default function OrderDetailScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const orderOptions = trpc.orders.byId.queryOptions({ orderId: id! });
  const { data: order } = useQuery({
    ...orderOptions,
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data && ACTIVE.includes(query.state.data.status)
        ? 5_000
        : false,
  });

  const cancel = useMutation(
    trpc.orders.cancel.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orderOptions.queryKey });
        void queryClient.invalidateQueries({
          queryKey: trpc.orders.mine.queryKey(),
        });
      },
    }),
  );

  if (!order) {
    return <View className="flex-1 bg-background" />;
  }

  const reachedStatuses = new Set(
    order.statusEvents.map((event) => event.toStatus),
  );
  const cancelled = order.status === "cancelled";
  const canCancel = order.status === "placed" || order.status === "assigned";

  return (
    <Screen padded={false}>
      <ScrollView
        className="flex-1 px-5"
        contentContainerClassName="gap-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <ScreenBackHeader
          title={t("shop.orderNumber", { number: String(order.orderNumber) })}
        />

      {/* timeline */}
      <Card className="gap-0">
        {cancelled ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="close-circle" size={20} color="#F0584F" />
            <Text className="text-lg font-bold text-destructive">
              {t("shop.status.cancelled")}
            </Text>
          </View>
        ) : (
          TIMELINE.map((step, i) => {
            const reached = reachedStatuses.has(step);
            const event = order.statusEvents.find((e) => e.toStatus === step);
            const last = i === TIMELINE.length - 1;
            return (
              <View key={step} className="flex-row gap-3">
                {/* node + connector rail */}
                <View className="items-center">
                  <View
                    className={`size-5 items-center justify-center rounded-full ${
                      reached ? "bg-primary" : "border border-border bg-elevated"
                    }`}
                  >
                    {reached ? (
                      <Ionicons name="checkmark" size={12} color="#0E0E10" />
                    ) : null}
                  </View>
                  {!last ? (
                    <View
                      className={`my-1 w-0.5 flex-1 ${
                        reached ? "bg-primary/50" : "bg-border"
                      }`}
                    />
                  ) : null}
                </View>
                <View
                  className={`flex-1 flex-row items-start justify-between ${
                    last ? "" : "pb-4"
                  }`}
                >
                  <Text
                    className={`flex-1 ${
                      reached
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t(`shop.status.${step}`)}
                  </Text>
                  {event ? (
                    <Text className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
        {order.driver?.name && !cancelled ? (
          <View className="mt-1 flex-row items-center gap-2 border-t border-border pt-3">
            <Ionicons name="bicycle-outline" size={18} color="#9B968C" />
            <Text className="text-sm text-muted-foreground">
              {order.driver.name}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* lines */}
      <Card className="gap-2">
        {order.items.map((line) => {
          const name =
            (locale === "ar" ? line.nameSnapshotAr : line.nameSnapshotEn) ??
            line.nameSnapshotAr ??
            line.nameSnapshotEn ??
            "—";
          const unavailable = line.status === "unavailable";
          return (
            <View key={line.id} className="flex-row items-center justify-between">
              <Text
                className={`flex-1 ${
                  unavailable
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {name} — {line.qty} {line.unit}
              </Text>
              {line.status !== "pending" ? (
                <Text
                  className={`text-xs font-semibold ${
                    unavailable ? "text-destructive" : "text-success"
                  }`}
                >
                  {t(`shop.lineStatus.${line.status}`)}
                  {line.actualLineTotal ? ` • ${line.actualLineTotal} EGP` : ""}
                </Text>
              ) : null}
            </View>
          );
        })}
        <View className="mt-2 gap-1 border-t border-border pt-2">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">{t("shop.deliveryFee")}</Text>
            <Text className="text-foreground">{order.deliveryFee} EGP</Text>
          </View>
          {order.codTotal ? (
            <View className="flex-row justify-between">
              <Text className="font-bold text-foreground">
                {t("shop.codTotal")}
              </Text>
              <Text className="text-lg font-black text-primary">
                {order.codTotal} EGP
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      {canCancel ? (
        <Button
          variant="destructive"
          label={t("shop.cancelOrder")}
          loading={cancel.isPending}
          onPress={() =>
            Alert.alert(t("shop.cancelOrder"), t("shop.cancelConfirm"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("common.confirm"),
                style: "destructive",
                onPress: () => cancel.mutate({ orderId: order.id }),
              },
            ])
          }
        />
      ) : null}
      </ScrollView>
    </Screen>
  );
}
