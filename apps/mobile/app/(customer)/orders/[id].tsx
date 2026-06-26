import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { formatQty, isMoneyKind } from "@workspace/validators/units";

import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { useAppAlert } from "@/components/ui/app-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen, ScreenBackHeader } from "@/components/ui/screen";
import { OrderDetailSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";
import { useCart } from "@/lib/cart-store";

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
  const router = useRouter();
  const { t, locale } = useTranslation();
  const appAlert = useAppAlert();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cart = useCart();

  const orderOptions = trpc.orders.byId.queryOptions({ orderId: id! });
  const { data: order, isLoading } = useQuery({
    ...orderOptions,
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data && ACTIVE.includes(query.state.data.status)
        ? 5_000
        : false,
  });

  const cancel = useMutation(
    trpc.orders.cancel.mutationOptions({
      // Optimistically flip the status so the UI reflects the cancel instantly;
      // roll back if the server rejects it.
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: orderOptions.queryKey });
        const prev = queryClient.getQueryData(orderOptions.queryKey);
        queryClient.setQueryData(orderOptions.queryKey, (old) =>
          old ? ({ ...old, status: "cancelled" } as typeof old) : old,
        );
        return { prev };
      },
      onError: (err, _vars, ctx) => {
        if (ctx?.prev)
          queryClient.setQueryData(orderOptions.queryKey, ctx.prev);
        appAlert(t("common.error"), err.message);
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: orderOptions.queryKey });
        void queryClient.invalidateQueries({
          queryKey: trpc.orders.mine.queryKey(),
        });
      },
    }),
  );

  // Customers may swap a line's unit only before the driver starts shopping.
  const editable = order?.status === "placed" || order?.status === "assigned";
  const { data: unitOptions } = useQuery({
    ...trpc.orders.lineUnitOptions.queryOptions({ orderId: id! }),
    enabled: !!id && editable,
  });

  const updateLineUnit = useMutation(
    trpc.orders.updateLineUnit.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orderOptions.queryKey });
      },
      onError: (err) => appAlert(t("common.error"), err.message),
    }),
  );

  const reorder = useMutation({
    mutationFn: () =>
      queryClient.fetchQuery(trpc.orders.reorderData.queryOptions({ orderId: id! })),
    onSuccess: (items) => {
      if (items.length === 0) {
        appAlert(t("common.error"), t("shop.reorderNoItems"));
        return;
      }
      cart.clear();
      for (const item of items) {
        if (!item.selectedUnitId) continue;
        cart.add(
          {
            itemId: item.itemId,
            nameEn: item.nameEn,
            nameAr: item.nameAr,
            units: item.units as import("@/lib/cart-store").CartUnit[],
            unitId: item.selectedUnitId,
            note: item.customerNote,
          },
          item.qty,
        );
      }
      router.push("/(customer)/cart");
    },
    onError: (err) => appAlert(t("common.error"), err.message),
  });

  if (isLoading || !order) {
    return (
      <Screen padded={false}>
        <ScreenBackHeader
          onBack={() => void router.push("/orders")}
          title=""
          className="px-4"
        />
        <OrderDetailSkeleton />
      </Screen>
    );
  }

  const reachedStatuses = new Set(
    order.statusEvents.map((event) => event.toStatus),
  );
  const cancelled = order.status === "cancelled";
  const canCancel = order.status === "placed" || order.status === "assigned";
  const isTerminal = order.status === "delivered" || order.status === "cancelled";

  return (
    <Screen padded={false}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="gap-4 pb-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ScreenBackHeader
          onBack={() => void router.push("/orders")}
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
                      className={`size-5 items-center justify-center rounded-full ${reached ? "bg-primary" : "border border-border bg-elevated"
                        }`}
                    >
                      {reached ? (
                        <Ionicons name="checkmark" size={12} color="#0E0E10" />
                      ) : null}
                    </View>
                    {!last ? (
                      <View
                        className={`my-1 w-0.5 flex-1 ${reached ? "bg-primary/50" : "bg-border"
                          }`}
                      />
                    ) : null}
                  </View>
                  <View
                    className={`flex-1 flex-row items-start justify-between ${last ? "" : "pb-4"
                      }`}
                  >
                    <Text
                      className={`flex-1 ${reached
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
            const lineUnits = unitOptions?.[line.id] ?? [];
            const canEditUnit = editable && lineUnits.length > 1;
            return (
              <View key={line.id} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`flex-1 ${unavailable
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                      }`}
                  >
                    {name} —{" "}
                    {isMoneyKind(line.unitKind)
                      ? t("shop.egpWorth", { amount: Number(line.qty) })
                      : `${formatQty(Number(line.qty), line.unitKind)}${canEditUnit ? "" : ` ${t(`units.${line.unit}` as never)}`
                      }`}
                  </Text>
                  {line.status !== "pending" ? (
                    <Text
                      className={`text-xs font-semibold ${unavailable ? "text-destructive" : "text-success"
                        }`}
                    >
                      {t(`shop.lineStatus.${line.status}`)}
                      {line.actualLineTotal ? ` • ${line.actualLineTotal} EGP` : ""}
                    </Text>
                  ) : null}
                </View>
                {canEditUnit ? (
                  <View className="flex-row flex-wrap gap-1.5">
                    {lineUnits.map((code) => {
                      const selected = code === line.unit;
                      return (
                        <Pressable
                          key={code}
                          onPress={() =>
                            !selected &&
                            updateLineUnit.mutate({
                              orderId: order.id,
                              orderItemId: line.id,
                              unit: code,
                            })
                          }
                          className={`rounded-full border px-3 py-1 ${selected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-elevated"
                            }`}
                        >
                          <Text
                            className={`text-xs ${selected
                              ? "font-semibold text-primary"
                              : "text-muted-foreground"
                              }`}
                          >
                            {t(`units.${code}` as never)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
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

      </ScrollView>

      {canCancel ? (
        <BottomActionBar className="px-4">
          <Button
            variant="destructive"
            label={t("shop.cancelOrder")}
            loading={cancel.isPending}
            onPress={() =>
              appAlert(t("shop.cancelOrder"), t("shop.cancelConfirm"), [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("common.confirm"),
                  style: "destructive",
                  onPress: () => cancel.mutate({ orderId: order.id }),
                },
              ])
            }
          />
        </BottomActionBar>
      ) : null}
      {isTerminal ? (
        <BottomActionBar className="px-4">
          <Button
            label={t("shop.orderAgain")}
            loading={reorder.isPending}
            onPress={() => reorder.mutate()}
          />
        </BottomActionBar>
      ) : null}
    </Screen>
  );
}
