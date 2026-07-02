import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { formatQty, isMoneyKind, stepForKind } from "@workspace/validators/units";

import { Button } from "@/components/ui/button";
import { ScreenFooter } from "@/components/ui/keyboard-screen";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { useAppAlert } from "@/components/ui/app-alert";
import { ItemThumb } from "@/components/item-thumb";
import { QuantityUnitSheet } from "@/components/quantity-unit-sheet";
import { track } from "@/lib/analytics";
import { ensureSignedIn } from "@/lib/auth-gate";
import { useTranslation } from "@/lib/i18n";
import { cartLineUnit, cartLineUnitName, useCart, type CartLine } from "@/lib/cart-store";
import { useTRPC } from "@/lib/trpc";
import { itemDisplayName } from "@/components/item-utils";

/** One cart line: thumbnail, kind-aware stepper, tap-to-edit unit + quantity. */
function CartRow({ line, onEdit }: { line: CartLine; onEdit: () => void }) {
  const { t, locale } = useTranslation();
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const unit = cartLineUnit(line);
  const kind = unit?.kind ?? "count";
  const step = stepForKind(kind);

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-center gap-3">
        <ItemThumb uri={line.imageUrl} label={itemDisplayName(line, locale)} size={52} />
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-foreground">
            {itemDisplayName(line, locale)}
          </Text>
          <Pressable className="self-start" hitSlop={8} onPress={onEdit}>
            <Text className="text-xs text-primary">
              {isMoneyKind(kind)
                ? t("shop.egpWorth", { amount: line.qty })
                : `${formatQty(line.qty, kind)} ${cartLineUnitName(line, locale)}`}
            </Text>
          </Pressable>
          <Pressable
            className="self-start"
            hitSlop={8}
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
          <Pressable hitSlop={8} onPress={onEdit}>
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

      {/* Per-item note — tap to add or edit in the picker sheet. */}
      <Pressable
        hitSlop={8}
        onPress={onEdit}
        className="flex-row items-center gap-1.5 border-t border-border pt-2"
      >
        <Ionicons
          name={line.note ? "chatbox-ellipses" : "add-circle-outline"}
          size={14}
          color="#9B968C"
        />
        <Text
          className={`flex-1 text-xs ${line.note ? "text-foreground" : "text-muted-foreground"}`}
          numberOfLines={2}
        >
          {line.note ? line.note : t("shop.addNote")}
        </Text>
      </Pressable>
    </View>
  );
}

export default function CartScreen() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const alert = useAppAlert();
  const { data: fee } = useQuery(trpc.catalog.deliveryFee.queryOptions());
  // The picker sheet is mounted at the screen root (outside the FlatList) so the
  // keyboard-aware modal gets correct keyboard framing — a sheet nested in a
  // scrolling row misbehaves on first open. One sheet serves every line.
  const [editingLine, setEditingLine] = useState<CartLine | null>(null);

  function confirmClearCart() {
    alert(t("shop.clearCartConfirmTitle"), t("shop.clearCartConfirmMessage"), [
      {
        text: t("shop.clearCart"),
        style: "destructive",
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          clear();
        },
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  return (
    <Screen padded={false}>
      <ScreenHeader
        className="px-4"
        title={t("shop.cartTitle")}
        right={
          lines.length > 0 ? (
            <Pressable hitSlop={12} onPress={confirmClearCart}>
              <Text className="text-sm text-destructive">{t("shop.clearCart")}</Text>
            </Pressable>
          ) : undefined
        }
      />

      {lines.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-7xl">🛍️</Text>
          <View className="items-center gap-1">
            <Text className="text-xl font-semibold text-foreground">{t("shop.cartEmpty")}</Text>
            <Text className="text-center text-sm text-muted-foreground">{t("shop.cartEmptyHint")}</Text>
          </View>
          <Button
            label={t("shop.continueShopping")}
            variant="outline"
            onPress={() => router.push("/(customer)/")}
          />
        </View>
      ) : (
        <>
          <FlatList
            className="flex-1"
            data={lines}
            keyExtractor={(l) => l.itemId}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item: line }) => (
              <CartRow line={line} onEdit={() => setEditingLine(line)} />
            )}
            contentContainerClassName="px-4 pb-4 pt-1"
          />
          <ScreenFooter insideTabs>
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
          </ScreenFooter>
        </>
      )}

      {editingLine ? (
        <QuantityUnitSheet
          item={{
            id: editingLine.itemId,
            nameEn: editingLine.nameEn,
            nameAr: editingLine.nameAr,
            imageUrl: editingLine.imageUrl,
            units: editingLine.units,
            defaultUnit: cartLineUnit(editingLine)?.code ?? null,
          }}
          visible={editingLine !== null}
          onClose={() => setEditingLine(null)}
          initialUnitId={editingLine.unitId}
          initialQty={editingLine.qty}
          initialNote={editingLine.note}
        />
      ) : null}
    </Screen>
  );
}
