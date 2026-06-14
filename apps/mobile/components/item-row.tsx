import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "@/lib/i18n";
import { cartLineFromItem, type CartUnit, useCart } from "@/lib/cart-store";
import { ItemThumb } from "./item-thumb";

type CatalogItem = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  imageUrl?: string | null;
  units: CartUnit[];
  defaultUnit: string | null;
};

export function itemDisplayName(
  item: { nameEn: string | null; nameAr: string | null },
  locale: string,
) {
  return (locale === "ar" ? item.nameAr : item.nameEn) ?? item.nameAr ?? item.nameEn ?? "—";
}

/** Catalog row with leading thumbnail, qty stepper — the only way items enter the cart (C3/C5). */
export function ItemRow({ item }: { item: CatalogItem }) {
  const { t, locale } = useTranslation();
  const line = useCart((s) => s.lines.find((l) => l.itemId === item.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  const name = itemDisplayName(item, locale);
  const defaultUnitObj =
    item.units.find((u) => u.code === item.defaultUnit) ?? item.units[0];
  const unitLabel = defaultUnitObj
    ? (locale === "ar" ? defaultUnitObj.nameAr : defaultUnitObj.nameEn)
    : "";
  const disabled = item.units.length === 0;

  return (
    <View className="flex-row items-center gap-4 border-b border-border py-4">
      <ItemThumb uri={item.imageUrl} label={name} size={52} />

      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-foreground">{name}</Text>
        {unitLabel ? (
          <Text className="text-xs text-muted-foreground">{unitLabel}</Text>
        ) : null}
      </View>

      {line ? (
        <View className="flex-row items-center gap-3 rounded-2xl bg-elevated px-2 py-1">
          <Pressable
            className="size-9 items-center justify-center rounded-full bg-card active:opacity-70"
            onPress={() => setQty(item.id, line.qty - 1)}
          >
            <Ionicons name="remove" size={18} color="#9B968C" />
          </Pressable>
          <Text className="min-w-6 text-center text-base font-bold text-foreground">
            {line.qty}
          </Text>
          <Pressable
            className="size-9 items-center justify-center rounded-full bg-primary active:opacity-70"
            onPress={() => setQty(item.id, line.qty + 1)}
          >
            <Ionicons name="add" size={18} color="#0E0E10" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          className={`rounded-2xl px-5 py-2.5 active:opacity-70 ${disabled ? "bg-elevated" : "bg-primary"}`}
          disabled={disabled}
          onPress={() => add(cartLineFromItem(item))}
        >
          <Text className={`text-sm font-semibold ${disabled ? "text-muted-foreground" : "text-primary-foreground"}`}>
            {t("shop.addToCart")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
