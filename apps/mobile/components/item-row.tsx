import { Pressable, Text, View } from "react-native";

import { useTranslation } from "@/lib/i18n";
import { type CartLine, useCart } from "@/lib/cart-store";

type CatalogItem = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  defaultUnit: CartLine["unit"];
};

export function itemDisplayName(
  item: { nameEn: string | null; nameAr: string | null },
  locale: string,
) {
  return (locale === "ar" ? item.nameAr : item.nameEn) ?? item.nameAr ?? item.nameEn ?? "—";
}

/** Catalog row with qty stepper — the only way items enter the cart (C3/C5). */
export function ItemRow({ item }: { item: CatalogItem }) {
  const { t, locale } = useTranslation();
  const line = useCart((s) => s.lines.find((l) => l.itemId === item.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  return (
    <View className="flex-row items-center justify-between border-b border-border py-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-foreground">
          {itemDisplayName(item, locale)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {t(`units.${item.defaultUnit}`)}
        </Text>
      </View>
      {line ? (
        <View className="flex-row items-center gap-3">
          <Pressable
            className="size-9 items-center justify-center rounded-full bg-muted"
            onPress={() => setQty(item.id, line.qty - 1)}
          >
            <Text className="text-lg font-bold text-foreground">−</Text>
          </Pressable>
          <Text className="min-w-6 text-center text-base font-bold text-foreground">
            {line.qty}
          </Text>
          <Pressable
            className="size-9 items-center justify-center rounded-full bg-primary"
            onPress={() => setQty(item.id, line.qty + 1)}
          >
            <Text className="text-lg font-bold text-primary-foreground">+</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          className="rounded-full bg-primary px-4 py-2"
          onPress={() =>
            add({
              itemId: item.id,
              nameEn: item.nameEn,
              nameAr: item.nameAr,
              unit: item.defaultUnit,
            })
          }
        >
          <Text className="font-semibold text-primary-foreground">
            {t("shop.addToCart")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
