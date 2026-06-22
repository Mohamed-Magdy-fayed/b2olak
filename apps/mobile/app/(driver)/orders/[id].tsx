import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen, ScreenBackHeader } from "@/components/ui/screen";
import { StatusChip } from "@/components/ui/status-chip";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

/** One screen drives the whole fulfillment journey (D3→D5) by order status. */
export default function DriverOrderScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [cashCollected, setCashCollected] = useState("");

  const orderOptions = trpc.orders.byId.queryOptions({ orderId: id! });
  const { data: order, isLoading } = useQuery({ ...orderOptions, enabled: !!id });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: orderOptions.queryKey });
    void queryClient.invalidateQueries({
      queryKey: trpc.driver.myOrders.queryKey(),
    });
  };

  const mutationOpts = {
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: { message: string }) => {
      setError(
        err.message === "driver.linesPending"
          ? t("driver.linesPending")
          : err.message === "driver.priceRequired"
            ? t("driver.priceRequired")
            : t("errors.unknown"),
      );
    },
  };

  const startShopping = useMutation(
    trpc.driver.startShopping.mutationOptions({
      ...mutationOpts,
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: orderOptions.queryKey });
        const previous = queryClient.getQueryData(orderOptions.queryKey);
        queryClient.setQueryData(orderOptions.queryKey, (old) =>
          old ? { ...old, status: "shopping" as const } : old,
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(orderOptions.queryKey, context.previous);
        }
      },
    }),
  );
  // Per-line edits update the cache optimistically so the row flips instantly;
  // the server call (and its recomputed totals) reconciles in the background.
  const updateLine = useMutation(
    trpc.driver.updateLine.mutationOptions({
      onMutate: async (vars) => {
        await queryClient.cancelQueries({ queryKey: orderOptions.queryKey });
        const previous = queryClient.getQueryData(orderOptions.queryKey);
        setError(null);
        queryClient.setQueryData(orderOptions.queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((it) =>
              it.id === vars.orderItemId
                ? {
                    ...it,
                    status: vars.status,
                    actualUnitPrice:
                      vars.actualUnitPrice != null
                        ? vars.actualUnitPrice.toFixed(2)
                        : null,
                    actualLineTotal:
                      vars.actualUnitPrice != null
                        ? (vars.actualUnitPrice * Number(it.qty)).toFixed(2)
                        : null,
                  }
                : it,
            ),
          };
        });
        return { previous };
      },
      onSuccess: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setError(null);
        invalidate();
      },
      onError: (err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(orderOptions.queryKey, context.previous);
        }
        setError(
          err.message === "driver.linesPending"
            ? t("driver.linesPending")
            : err.message === "driver.priceRequired"
              ? t("driver.priceRequired")
              : t("errors.unknown"),
        );
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: orderOptions.queryKey,
        });
      },
    }),
  );
  const doneShopping = useMutation(
    trpc.driver.doneShopping.mutationOptions({
      ...mutationOpts,
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: orderOptions.queryKey });
        const previous = queryClient.getQueryData(orderOptions.queryKey);
        queryClient.setQueryData(orderOptions.queryKey, (old) =>
          old ? { ...old, status: "purchased" as const } : old,
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(orderOptions.queryKey, context.previous);
        }
      },
    }),
  );
  const startDelivery = useMutation(
    trpc.driver.startDelivery.mutationOptions({
      ...mutationOpts,
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: orderOptions.queryKey });
        const previous = queryClient.getQueryData(orderOptions.queryKey);
        queryClient.setQueryData(orderOptions.queryKey, (old) =>
          old ? { ...old, status: "delivering" as const } : old,
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(orderOptions.queryKey, context.previous);
        }
      },
    }),
  );
  const markDelivered = useMutation(
    trpc.driver.markDelivered.mutationOptions({
      ...mutationOpts,
      onSuccess: () => {
        invalidate();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t("driver.orderDelivered"), t("driver.orderDeliveredMessage"), [
          { text: t("common.confirm"), onPress: () => router.back() },
        ]);
      },
    }),
  );

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }
  if (!order) return <Screen />;

  const lineName = (line: (typeof order.items)[number]) =>
    (locale === "ar" ? line.nameSnapshotAr : line.nameSnapshotEn) ??
    line.nameSnapshotAr ??
    line.nameSnapshotEn ??
    "—";

  const shoppingMode = ["shopping", "purchased"].includes(order.status);
  const itemsTotal = order.actualItemsTotal ?? "0.00";
  const codTotal =
    order.codTotal ??
    (Number(itemsTotal) + Number(order.deliveryFee)).toFixed(2);

  const addressBlock = [
    order.area,
    order.street,
    order.building,
    order.floor && `${t("address.floor")} ${order.floor}`,
    order.apartment && `${t("address.apartment")} ${order.apartment}`,
    order.landmark,
  ]
    .filter(Boolean)
    .join("، ");

  // The single status CTA is pinned to the bottom — except while collecting
  // cash, where the inline card (with its amount input) drives the flow.
  const showActionBar =
    order.status === "assigned" ||
    order.status === "shopping" ||
    order.status === "purchased" ||
    (order.status === "delivering" && !collecting);

  return (
    <Screen>
      <ScreenBackHeader
        title={t("shop.orderNumber", { number: String(order.orderNumber) })}
        right={<StatusChip status={order.status} />}
      />

      <ScrollView
        className="-mx-5 flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* address + contact */}
        <Card className="gap-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="location-outline" size={16} color="#C9A227" />
            <Text className="font-semibold text-foreground">
              {t("driver.address")}
            </Text>
          </View>
          <Text className="text-foreground" selectable>
            {order.city}، {addressBlock}
          </Text>
          {order.customerNote ? (
            <View className="flex-row items-start gap-2 rounded-xl bg-elevated px-3 py-2">
              <Ionicons name="chatbubble-outline" size={14} color="#9B968C" />
              <Text className="flex-1 text-sm text-muted-foreground">
                {t("driver.customerNote")}: {order.customerNote}
              </Text>
            </View>
          ) : null}
          <Pressable
            className="h-10 flex-row items-center justify-center gap-2 rounded-2xl border border-border px-4 active:opacity-80"
            onPress={() => void Linking.openURL(`tel:${order.contactPhone}`)}
          >
            <Ionicons name="call-outline" size={16} color="#C9A227" />
            <Text className="text-sm font-medium text-foreground">
              {t("driver.callCustomer")}
            </Text>
          </Pressable>
        </Card>

        {/* item checklist */}
        <Card className="gap-4">
          {order.items.map((line, index) => {
            const resolved = line.status !== "pending";
            const isLast = index === order.items.length - 1;
            return (
              <View
                key={line.id}
                className={`gap-2 ${!isLast ? "border-b border-border pb-4" : ""}`}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <Text
                    className={`flex-1 text-base font-semibold ${
                      line.status === "unavailable"
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {lineName(line)} — {line.qty} {line.unit}
                  </Text>
                  {resolved ? (
                    <View
                      className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
                        line.status === "unavailable"
                          ? "bg-destructive/10"
                          : "bg-success/10"
                      }`}
                    >
                      <Ionicons
                        name={
                          line.status === "unavailable"
                            ? "close-circle-outline"
                            : "checkmark-circle-outline"
                        }
                        size={12}
                        color={
                          line.status === "unavailable" ? "#F0584F" : "#34D399"
                        }
                      />
                      <Text
                        className={`text-xs font-bold ${
                          line.status === "unavailable"
                            ? "text-destructive"
                            : "text-success"
                        }`}
                      >
                        {t(`shop.lineStatus.${line.status}` as never)}
                        {line.actualLineTotal
                          ? ` • ${line.actualLineTotal}`
                          : ""}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {line.customerNote ? (
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons
                      name="chatbubble-outline"
                      size={13}
                      color="#9B968C"
                    />
                    <Text className="text-xs text-muted-foreground">
                      {line.customerNote}
                    </Text>
                  </View>
                ) : null}
                {shoppingMode ? (
                  <View className="flex-row items-center gap-2">
                    <Input
                      className="h-12 flex-1"
                      placeholder={t("driver.enterPrice")}
                      keyboardType="decimal-pad"
                      value={prices[line.id] ?? line.actualUnitPrice ?? ""}
                      onChangeText={(value) =>
                        setPrices((p) => ({ ...p, [line.id]: value }))
                      }
                      style={{ textAlign: "left", writingDirection: "ltr", minWidth: 80 }}
                    />
                    <Pressable
                      className="size-12 items-center justify-center rounded-full bg-success active:opacity-80"
                      onPress={() => {
                        const price = Number(
                          prices[line.id] ?? line.actualUnitPrice,
                        );
                        if (!price || price <= 0) {
                          setError(t("driver.priceRequired"));
                          return;
                        }
                        updateLine.mutate({
                          orderItemId: line.id,
                          status: "found",
                          actualUnitPrice: price,
                        });
                      }}
                    >
                      <Ionicons name="checkmark" size={22} color="#0E0E10" />
                    </Pressable>
                    <Pressable
                      className="size-12 items-center justify-center rounded-full bg-destructive active:opacity-80"
                      onPress={() =>
                        updateLine.mutate({
                          orderItemId: line.id,
                          status: "unavailable",
                        })
                      }
                    >
                      <Ionicons name="close" size={22} color="#F5F2EC" />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* COD totals */}
          <View className="gap-2 border-t border-border pt-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">
                {t("driver.itemsTotal")}
              </Text>
              <Text className="text-sm text-foreground">{itemsTotal} EGP</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">
                {t("shop.deliveryFee")}
              </Text>
              <Text className="text-sm text-foreground">
                {order.deliveryFee} EGP
              </Text>
            </View>
            <View className="mt-1 flex-row items-center justify-between rounded-xl bg-primary/10 px-3 py-2.5">
              <Text className="font-semibold text-foreground">
                {t("driver.codToCollect")}
              </Text>
              <Text className="font-display text-xl text-primary">
                {codTotal} EGP
              </Text>
            </View>
          </View>
        </Card>

        {error ? (
          <View className="flex-row items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3">
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color="#F0584F"
            />
            <Text className="flex-1 text-sm text-destructive">{error}</Text>
          </View>
        ) : null}

        {order.status === "delivering" && collecting ? (
          <Card className="gap-3">
            <Text className="font-semibold text-foreground">
              {t("driver.cashCollectedLabel")}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {t("driver.cashCollectedHint", { amount: codTotal })}
            </Text>
            <Input
              keyboardType="decimal-pad"
              value={cashCollected}
              onChangeText={setCashCollected}
              style={{ textAlign: "left", writingDirection: "ltr" }}
            />
            <Button
              label={t("driver.confirmCollected")}
              loading={markDelivered.isPending}
              onPress={() => {
                const amount = Number(cashCollected);
                if (!amount || amount <= 0) {
                  setError(t("driver.amountRequired"));
                  return;
                }
                markDelivered.mutate({
                  orderId: order.id,
                  amountCollected: amount,
                });
              }}
            />
          </Card>
        ) : null}
      </ScrollView>

      {showActionBar ? (
        <BottomActionBar className="-mx-5 px-5">
          {order.status === "assigned" ? (
            <Button
              label={t("driver.startShopping")}
              loading={startShopping.isPending}
              onPress={() => startShopping.mutate({ orderId: order.id })}
            />
          ) : null}
          {order.status === "shopping" ? (
            <Button
              label={t("driver.doneShopping")}
              loading={doneShopping.isPending}
              onPress={() => doneShopping.mutate({ orderId: order.id })}
            />
          ) : null}
          {order.status === "purchased" ? (
            <Button
              label={t("driver.startDelivery")}
              loading={startDelivery.isPending}
              onPress={() => startDelivery.mutate({ orderId: order.id })}
            />
          ) : null}
          {order.status === "delivering" && !collecting ? (
            <Button
              label={t("driver.markDelivered")}
              loading={markDelivered.isPending}
              onPress={() => setCollecting(true)}
            />
          ) : null}
        </BottomActionBar>
      ) : null}
    </Screen>
  );
}
