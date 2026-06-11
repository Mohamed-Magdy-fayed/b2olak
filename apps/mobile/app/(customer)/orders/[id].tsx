import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <ScrollView
      className="flex-1 bg-background px-4 pt-16"
      contentContainerClassName="gap-4 pb-10"
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          className="size-10 items-center justify-center rounded-full bg-muted"
          onPress={() => router.back()}
        >
          <Text className="text-lg">{locale === "ar" ? "→" : "←"}</Text>
        </Pressable>
        <Text className="text-2xl font-black text-foreground">
          {t("shop.orderNumber", { number: String(order.orderNumber) })}
        </Text>
      </View>

      {/* timeline */}
      <Card className="gap-3">
        {cancelled ? (
          <Text className="text-lg font-bold text-destructive">
            {t("shop.status.cancelled")}
          </Text>
        ) : (
          TIMELINE.map((step) => {
            const reached = reachedStatuses.has(step);
            const event = order.statusEvents.find((e) => e.toStatus === step);
            return (
              <View key={step} className="flex-row items-center gap-3">
                <View
                  className={`size-4 rounded-full ${
                    reached ? "bg-primary" : "bg-muted"
                  }`}
                />
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
            );
          })
        )}
        {order.driver?.name && !cancelled ? (
          <Text className="text-sm text-muted-foreground">
            🛵 {order.driver.name}
          </Text>
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
                {name} — {line.qty} {t(`units.${line.unit}`)}
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
  );
}
