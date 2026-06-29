import { useState, useRef } from "react";
import { Keyboard, Linking, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { formatQty, isMoneyKind } from "@workspace/validators/units";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen, ScreenBackHeader } from "@/components/ui/screen";
import { DriverOrderDetailSkeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { useAppAlert } from "@/components/ui/app-alert";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";
import {
  KeyboardAwareScreen,
  KeyboardStickyFooter,
} from "@/components/ui/keyboard-screen";

/** One screen drives the whole fulfillment journey (D3→D5) by order status. */
export default function DriverOrderScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const appAlert = useAppAlert();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [cashCollected, setCashCollected] = useState("");
  const priceInputRefs = useRef<Record<string, any>>({});

  const orderOptions = trpc.orders.byId.queryOptions({ orderId: id! });
  const { data: order, isLoading, isRefetching } = useQuery({ ...orderOptions, enabled: !!id });

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
            items: old.items.map((it) => {
              if (it.id !== vars.orderItemId) return it;
              const money = isMoneyKind(it.unitKind);
              const resolving =
                vars.status === "found" || vars.status === "substituted";
              return {
                ...it,
                status: vars.status,
                // Money lines have no per-unit price; the total is the worth.
                actualUnitPrice:
                  !money && vars.actualUnitPrice != null
                    ? vars.actualUnitPrice.toFixed(2)
                    : null,
                actualLineTotal: !resolving
                  ? null
                  : money
                    ? (vars.actualUnitPrice ?? Number(it.qty)).toFixed(2)
                    : vars.actualUnitPrice != null
                      ? (vars.actualUnitPrice * Number(it.qty)).toFixed(2)
                      : null,
              };
            }),
          };
        });
        return { previous };
      },
      onSuccess: ({ }) => {
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
        appAlert(t("driver.orderDelivered"), t("driver.orderDeliveredMessage"), [
          { text: t("common.confirm"), onPress: () => router.back() },
        ]);
        setCashCollected("")
      },
    }),
  );

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenBackHeader title="" className="px-4" />
        <DriverOrderDetailSkeleton />
      </Screen>
    );
  }
  if (!order) return <Screen />;

  const lineName = (line: (typeof order.items)[number]) =>
    (locale === "ar" ? line.nameSnapshotAr : line.nameSnapshotEn) ??
    line.nameSnapshotAr ??
    line.nameSnapshotEn ??
    "—";

  // Kind-aware quantity label: money → "10 EGP worth", else "½ kg".
  const lineQtyLabel = (line: (typeof order.items)[number]) =>
    isMoneyKind(line.unitKind)
      ? t("shop.egpWorth", { amount: Number(line.qty) })
      : `${formatQty(Number(line.qty), line.unitKind)} ${t(`units.${line.unit}` as never)}`;

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

  function handleInputNext(isLast: boolean, index: number) {
    if (!order) return
    if (!isLast) {
      const nextIndex = index + 1;
      const nextLine = order.items[nextIndex];
      if (nextLine) {
        setTimeout(() => {
          priceInputRefs.current[nextLine.id]?.focus();
        }, 10);
      }
    } else {
      Keyboard.dismiss()
    }
  }

  return (
    <KeyboardAwareScreen
      padded
      bottomOffset={24}
      contentContainerStyle={{ paddingBottom: 24 }}
      header={
        <ScreenBackHeader
          title={t("shop.orderNumber", { number: String(order.orderNumber) })}
          right={<StatusChip status={order.status} />}
        />
      }
      footer={
        showActionBar ? (
          <KeyboardStickyFooter className="bg-background border-border border-t p-4">
            {order.status === "assigned" ? (
              <Button
                label={t("driver.startShopping")}
                loading={startShopping.isPending}
                disabled={isRefetching || isLoading}
                onPress={() => startShopping.mutate({ orderId: order.id })}
              />
            ) : null}
            {order.status === "shopping" ? (
              <Button
                label={t("driver.doneShopping")}
                loading={doneShopping.isPending}
                disabled={isRefetching || isLoading || updateLine.isPending || order.items.some(item => item.status === "pending")}
                onPress={() => doneShopping.mutate({ orderId: order.id })}
              />
            ) : null}
            {order.status === "purchased" ? (
              <Button
                label={t("driver.startDelivery")}
                loading={startDelivery.isPending}
                disabled={isRefetching || isLoading}
                onPress={() => startDelivery.mutate({ orderId: order.id })}
              />
            ) : null}
            {order.status === "delivering" && !collecting ? (
              <Button
                label={t("driver.markDelivered")}
                loading={markDelivered.isPending}
                disabled={isRefetching || isLoading}
                onPress={() => setCollecting(true)}
              />
            ) : null}
          </KeyboardStickyFooter>
        ) : null
      }
    >
      <View className="gap-4 pt-1">
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
            const money = isMoneyKind(line.unitKind);
            const isLast = index === order.items.length - 1;
            return (
              <View
                key={line.id}
                className={`gap-2 ${!isLast ? "border-b border-border pb-4" : ""}`}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <Text
                    className={`flex-1 text-base font-semibold ${line.status === "unavailable"
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                      }`}
                  >
                    {lineName(line)} — {lineQtyLabel(line)}
                  </Text>
                  {resolved ? (
                    <View
                      className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${line.status === "unavailable"
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
                        className={`text-xs font-bold ${line.status === "unavailable"
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
                      ref={(el) => {
                        if (el) priceInputRefs.current[line.id] = el;
                      }}
                      className="flex-1 text-sm"
                      multiline
                      returnKeyType={isLast ? "done" : "next"}
                      placeholder={
                        money
                          ? t("shop.egpWorth", { amount: Number(line.qty) })
                          : t("driver.enterPrice")
                      }
                      keyboardType="decimal-pad"
                      value={
                        prices[line.id] ??
                        line.actualUnitPrice ??
                        (isMoneyKind(line.unitKind) ? line.qty.toString() : "")
                      }
                      onSubmitEditing={() => {
                        handleInputNext(isLast, index)
                      }}
                      onChangeText={(value) =>
                        setPrices((p) => ({ ...p, [line.id]: value }))
                      }
                      style={{ textAlign: "center", textAlignVertical: "center", writingDirection: "ltr", direction: "ltr", minWidth: 80 }}
                    />
                    <Pressable
                      className="size-12 items-center justify-center rounded-full bg-success active:opacity-80"
                      onPress={() => {
                        const raw = prices[line.id] ?? line.actualUnitPrice ?? "";
                        const price = Number(raw);
                        // Money lines default to the requested worth — price optional.
                        if (!money && (!price || price <= 0)) {
                          setError(t("driver.priceRequired"));
                          return;
                        }
                        updateLine.mutate({
                          orderItemId: line.id,
                          status: "found",
                          actualUnitPrice:
                            raw && price > 0 ? price : undefined,
                        });


                      }}
                    >
                      <Ionicons name="checkmark" size={22} color="#0E0E10" />
                    </Pressable>
                    <Pressable
                      className="size-12 items-center justify-center rounded-full bg-destructive active:opacity-80"
                      onPress={() => {
                        // Clear the price input for this line
                        setPrices((p) => {
                          const newPrices = { ...p };
                          delete newPrices[line.id];
                          return newPrices;
                        });

                        updateLine.mutate({
                          orderItemId: line.id,
                          status: "unavailable",
                        })

                        if (!isLast) {
                          const nextIndex = index + 1;
                          const nextLine = order.items[nextIndex];
                          if (nextLine) {
                            setTimeout(() => {
                              priceInputRefs.current[nextLine.id]?.focus();
                            }, 10);
                          }
                        }
                      }}
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
              style={{ textAlign: "center", writingDirection: "ltr", direction: "ltr" }}
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
      </View>
    </KeyboardAwareScreen>
  );
}
