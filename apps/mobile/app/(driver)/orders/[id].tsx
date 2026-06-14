import { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const { data: order } = useQuery({ ...orderOptions, enabled: !!id });

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
    trpc.driver.startShopping.mutationOptions(mutationOpts),
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
    trpc.driver.doneShopping.mutationOptions(mutationOpts),
  );
  const startDelivery = useMutation(
    trpc.driver.startDelivery.mutationOptions(mutationOpts),
  );
  const markDelivered = useMutation(
    trpc.driver.markDelivered.mutationOptions({
      ...mutationOpts,
      onSuccess: () => {
        invalidate();
        router.back();
      },
    }),
  );

  if (!order) return <View className="flex-1 bg-background" />;

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

  return (
    <ScrollView
      className="flex-1 bg-background px-4 pt-16"
      contentContainerClassName="gap-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          className="size-10 items-center justify-center rounded-full bg-muted"
          onPress={() => router.back()}
        >
          <Text className="text-lg">{locale === "ar" ? "→" : "←"}</Text>
        </Pressable>
        <Text className="flex-1 text-2xl font-black text-foreground">
          {t("shop.orderNumber", { number: String(order.orderNumber) })}
        </Text>
        <Text className="font-bold text-primary">
          {t(`shop.status.${order.status}` as never)}
        </Text>
      </View>

      {/* address + contact */}
      <Card className="gap-2">
        <Text className="font-bold text-foreground">{t("driver.address")}</Text>
        <Text className="text-foreground" selectable>
          {order.city}، {addressBlock}
        </Text>
        {order.customerNote ? (
          <Text className="text-sm text-muted-foreground">
            {t("driver.customerNote")}: {order.customerNote}
          </Text>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          label={`📞 ${t("driver.callCustomer")}`}
          onPress={() => void Linking.openURL(`tel:${order.contactPhone}`)}
        />
      </Card>

      {/* checklist */}
      <Card className="gap-3">
        {order.items.map((line) => {
          const resolved = line.status !== "pending";
          return (
            <View key={line.id} className="gap-2 border-b border-border pb-3">
              <View className="flex-row items-center justify-between">
                <Text
                  className={`flex-1 text-base font-semibold ${
                    line.status === "unavailable"
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}
                >
                  {lineName(line)} — {line.qty} {t(`units.${line.unit}`)}
                </Text>
                {resolved ? (
                  <Text
                    className={`text-xs font-bold ${
                      line.status === "unavailable"
                        ? "text-destructive"
                        : "text-success"
                    }`}
                  >
                    {t(`shop.lineStatus.${line.status}` as never)}
                    {line.actualLineTotal ? ` • ${line.actualLineTotal}` : ""}
                  </Text>
                ) : null}
              </View>
              {line.customerNote ? (
                <Text className="text-xs text-muted-foreground">
                  💬 {line.customerNote}
                </Text>
              ) : null}
              {shoppingMode ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="h-12 flex-1 rounded-lg border border-input bg-card px-3 text-foreground"
                    placeholder={t("driver.enterPrice")}
                    placeholderTextColor="#71717a"
                    keyboardType="decimal-pad"
                    value={prices[line.id] ?? line.actualUnitPrice ?? ""}
                    onChangeText={(value) =>
                      setPrices((p) => ({ ...p, [line.id]: value }))
                    }
                    style={{ textAlign: "left", writingDirection: "ltr" }}
                  />
                  <Pressable
                    className="rounded-lg bg-success px-3 py-3.5"
                    onPress={() => {
                      const price = Number(prices[line.id] ?? line.actualUnitPrice);
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
                    <Text className="font-bold text-white">
                      ✓ {t("driver.found")}
                    </Text>
                  </Pressable>
                  <Pressable
                    className="rounded-lg bg-destructive px-3 py-3.5"
                    onPress={() =>
                      updateLine.mutate({
                        orderItemId: line.id,
                        status: "unavailable",
                      })
                    }
                  >
                    <Text className="font-bold text-white">✕</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}

        <View className="gap-1 pt-1">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">{t("driver.itemsTotal")}</Text>
            <Text className="text-foreground">{itemsTotal} EGP</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">{t("shop.deliveryFee")}</Text>
            <Text className="text-foreground">{order.deliveryFee} EGP</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-lg font-bold text-foreground">
              {t("driver.codToCollect")}
            </Text>
            <Text className="text-xl font-black text-primary">{codTotal} EGP</Text>
          </View>
        </View>
      </Card>

      {error ? <Text className="text-destructive">{error}</Text> : null}

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
      {order.status === "delivering" && collecting ? (
        <Card className="gap-3">
          <Text className="font-semibold text-foreground">
            {t("driver.cashCollectedLabel")}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {t("driver.cashCollectedHint", { amount: codTotal })}
          </Text>
          <TextInput
            className="h-12 rounded-lg border border-input bg-card px-3 text-foreground"
            keyboardType="decimal-pad"
            value={cashCollected}
            onChangeText={setCashCollected}
            placeholderTextColor="#71717a"
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
              markDelivered.mutate({ orderId: order.id, amountCollected: amount });
            }}
          />
        </Card>
      ) : null}
    </ScrollView>
  );
}
