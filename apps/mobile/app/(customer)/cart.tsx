import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { itemDisplayName } from "@/components/item-row";
import { ItemThumb } from "@/components/item-thumb";
import { track } from "@/lib/analytics";
import { ensureSignedIn } from "@/lib/auth-gate";
import { useTranslation } from "@/lib/i18n";
import { useTabBarHeight } from "@/lib/use-tab-bar-height";
import { cartLineUnitName, useCart } from "@/lib/cart-store";
import { useTRPC } from "@/lib/trpc";

export default function CartScreen() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const setUnit = useCart((s) => s.setUnit);
  const remove = useCart((s) => s.remove);
  const tabBarHeight = useTabBarHeight();
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
            data={lines}
            keyExtractor={(l) => l.itemId}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item: line }) => (
              <View className="gap-2 rounded-2xl border border-border bg-card p-3">
                <View className="flex-row items-center gap-3">
                  <ItemThumb label={itemDisplayName(line, locale)} size={52} />
                  <View className="flex-1 gap-0.5">
                    <Text className="text-base font-semibold text-foreground">
                      {itemDisplayName(line, locale)}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {cartLineUnitName(line, locale)}
                    </Text>
                    <Pressable onPress={() => remove(line.itemId)} hitSlop={8}>
                      <Text className="text-xs text-destructive">
                        {t("shop.remove")}
                      </Text>
                    </Pressable>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      className="size-9 items-center justify-center rounded-full bg-muted"
                      onPress={() => setQty(line.itemId, line.qty - 1)}
                    >
                      <Text className="text-lg font-bold text-foreground">−</Text>
                    </Pressable>
                    <Text className="min-w-6 text-center text-base font-bold text-foreground">
                      {line.qty}
                    </Text>
                    <Pressable
                      className="size-9 items-center justify-center rounded-full bg-primary"
                      onPress={() => setQty(line.itemId, line.qty + 1)}
                    >
                      <Text className="text-lg font-bold text-primary-foreground">
                        +
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Unit picker — shown only when the item has more than one unit */}
                {line.units.length > 1 ? (
                  <View className="flex-row flex-wrap gap-1.5">
                    {line.units.map((u) => (
                      <Pressable
                        key={u.id}
                        onPress={() => setUnit(line.itemId, u.id)}
                        className={`rounded-full border px-2.5 py-1 ${
                          line.unitId === u.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-elevated"
                        }`}
                      >
                        <Text
                          className={`text-xs ${
                            line.unitId === u.id
                              ? "font-semibold text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {locale === "ar" ? u.nameAr : u.nameEn}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
            contentContainerClassName="pb-4 pt-1"
          />
          <View
            className="gap-3 border-t border-border pt-4"
            style={{ paddingBottom: tabBarHeight + 8 }}
          >
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
          </View>
        </>
      )}
    </Screen>
  );
}
