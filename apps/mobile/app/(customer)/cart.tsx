import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { formatQty, isMoneyKind, stepForKind } from "@workspace/validators/units";

import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { Button } from "@/components/ui/button";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { itemDisplayName } from "@/components/item-row";
import { ItemThumb } from "@/components/item-thumb";
import { QuantityUnitSheet } from "@/components/quantity-unit-sheet";
import { track } from "@/lib/analytics";
import { ensureSignedIn } from "@/lib/auth-gate";
import { useTranslation } from "@/lib/i18n";
import { cartLineUnit, cartLineUnitName, useCart, type CartLine } from "@/lib/cart-store";
import { useTRPC } from "@/lib/trpc";

/** One cart line: thumbnail, kind-aware stepper, tap-to-edit unit + quantity. */
function CartRow({ line }: { line: CartLine }) {
  const { t, locale } = useTranslation();
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const [sheetOpen, setSheetOpen] = useState(false);

  const unit = cartLineUnit(line);
  const kind = unit?.kind ?? "count";
  const step = stepForKind(kind);

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-center gap-3">
        <ItemThumb label={itemDisplayName(line, locale)} size={52} />
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-foreground">
            {itemDisplayName(line, locale)}
          </Text>
          <Pressable hitSlop={8} onPress={() => setSheetOpen(true)}>
            <Text className="text-xs text-primary">
              {isMoneyKind(kind)
                ? t("shop.egpWorth", { amount: line.qty })
                : `${formatQty(line.qty, kind)} ${cartLineUnitName(line, locale)}`}
            </Text>
          </Pressable>
          <Pressable
            hitSlop={16}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              remove(line.itemId);
            }}
          >
            <Text className="text-xs text-destructive">{t("shop.remove")}</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable
            className="size-9 items-center justify-center rounded-full bg-muted"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQty(line.itemId, line.qty - step);
            }}
          >
            <Text className="text-lg font-bold text-foreground">−</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => setSheetOpen(true)}>
            <Text className="min-w-6 text-center text-base font-bold text-foreground">
              {formatQty(line.qty, kind)}
            </Text>
          </Pressable>
          <Pressable
            className="size-9 items-center justify-center rounded-full bg-primary"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQty(line.itemId, line.qty + step);
            }}
          >
            <Text className="text-lg font-bold text-primary-foreground">+</Text>
          </Pressable>
        </View>
      </View>

      {sheetOpen ? (
        <QuantityUnitSheet
          item={{
            id: line.itemId,
            nameEn: line.nameEn,
            nameAr: line.nameAr,
            units: line.units,
            defaultUnit: unit?.code ?? null,
          }}
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          initialUnitId={line.unitId}
          initialQty={line.qty}
        />
      ) : null}
    </View>
  );
}

export default function CartScreen() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const lines = useCart((s) => s.lines);
  const { data: fee } = useQuery(trpc.catalog.deliveryFee.queryOptions());

  return (
    <Screen>
      <ScreenHeader title={t("shop.cartTitle")} />

      {lines.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-5xl">🛍️</Text>
          <Text className="text-muted-foreground">{t("shop.cartEmpty")}</Text>
        </View>
      ) : (
        <>
          <FlatList
            className="flex-1"
            data={lines}
            keyExtractor={(l) => l.itemId}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item: line }) => <CartRow line={line} />}
            contentContainerClassName="pb-4 pt-1"
          />
          <BottomActionBar>
            <Text className="text-muted-foreground">
              {t("shop.itemsAtMarketPrice")}
            </Text>
            <View className="flex-row justify-between">
              <Text className="text-foreground">{t("shop.deliveryFee")}</Text>
              <Text className="font-bold text-foreground">
                {fee ? `${fee.amount} EGP` : "…"}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              {t("shop.marketPriceNote")}
            </Text>
            <Button
              label={t("shop.checkout")}
              onPress={async () => {
                track("begin_checkout", {
                  value: fee ? Number(fee.amount) : undefined,
                  currency: "EGP",
                  itemCount: lines.length,
                });
                if (await ensureSignedIn("/(customer)/checkout")) {
                  router.push("/(customer)/checkout");
                }
              }}
            />
          </BottomActionBar>
        </>
      )}
    </Screen>
  );
}
