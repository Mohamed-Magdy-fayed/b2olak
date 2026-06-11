import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { itemDisplayName } from "@/components/item-row";
import { useTranslation } from "@/lib/i18n";
import { useCart } from "@/lib/cart-store";
import { useTRPC } from "@/lib/trpc";

export default function CartScreen() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { data: fee } = useQuery(trpc.catalog.deliveryFee.queryOptions());

  return (
    <View className="flex-1 bg-background px-4 pt-16">
      <Text className="mb-3 text-2xl font-black text-foreground">
        {t("shop.cartTitle")}
      </Text>

      {lines.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">{t("shop.cartEmpty")}</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={lines}
            keyExtractor={(l) => l.itemId}
            renderItem={({ item: line }) => (
              <View className="flex-row items-center justify-between border-b border-border py-3">
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-semibold text-foreground">
                    {itemDisplayName(line, locale)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {t(`units.${line.unit}`)}
                  </Text>
                  <Pressable onPress={() => remove(line.itemId)}>
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
                    <Text className="text-lg font-bold">−</Text>
                  </Pressable>
                  <Text className="min-w-6 text-center text-base font-bold">
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
            )}
            contentContainerClassName="pb-4"
          />
          <View className="gap-3 border-t border-border py-4">
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">
                {t("shop.itemsAtMarketPrice")}
              </Text>
            </View>
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
              onPress={() => router.push("/(customer)/checkout")}
            />
          </View>
        </>
      )}
    </View>
  );
}
