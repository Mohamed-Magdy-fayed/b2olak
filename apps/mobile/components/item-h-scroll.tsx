import { Pressable, ScrollView, Text, View } from "react-native";

import { type CartLine, useCart } from "@/lib/cart-store";
import { useTranslation } from "@/lib/i18n";
import { itemDisplayName } from "./item-row";
import { ItemThumb } from "./item-thumb";

type Item = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  imageUrl?: string | null;
  defaultUnit: CartLine["unit"];
};

type ItemHScrollProps = {
  title: string;
  items: Item[];
};

/** Small add/stepper button reusing the same cart store logic as ItemRow. */
function CompactAddButton({ item }: { item: Item }) {
  const { t } = useTranslation();
  const line = useCart((s) => s.lines.find((l) => l.itemId === item.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  if (line) {
    return (
      <View className="flex-row items-center justify-center gap-2 pt-1">
        <Pressable
          className="size-7 items-center justify-center rounded-full bg-muted"
          onPress={() => setQty(item.id, line.qty - 1)}
        >
          <Text className="text-sm font-bold text-foreground">−</Text>
        </Pressable>
        <Text className="min-w-5 text-center text-sm font-bold text-foreground">
          {line.qty}
        </Text>
        <Pressable
          className="size-7 items-center justify-center rounded-full bg-primary"
          onPress={() => setQty(item.id, line.qty + 1)}
        >
          <Text className="text-sm font-bold text-primary-foreground">+</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      className="mt-1 rounded-lg bg-primary px-3 py-1.5"
      onPress={() =>
        add({
          itemId: item.id,
          nameEn: item.nameEn,
          nameAr: item.nameAr,
          unit: item.defaultUnit,
        })
      }
    >
      <Text className="text-center text-xs font-semibold text-primary-foreground">
        {t("shop.addToCart")}
      </Text>
    </Pressable>
  );
}

/**
 * A titled horizontal scroller of compact item cards.
 * Renders nothing when items is empty.
 */
export function ItemHScroll({ title, items }: ItemHScrollProps) {
  const { locale } = useTranslation();

  if (items.length === 0) return null;

  return (
    <View className="mb-5">
      <Text className="mb-2 text-lg font-bold text-foreground">{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 pe-4"
      >
        {items.map((item) => {
          const name = itemDisplayName(item, locale);
          return (
            <View
              key={item.id}
              className="w-[140px] rounded-xl border border-border bg-card p-3"
            >
              <ItemThumb uri={item.imageUrl} label={name} size={80} />
              <Text
                className="mt-2 text-sm font-semibold text-foreground"
                numberOfLines={2}
              >
                {name}
              </Text>
              <CompactAddButton item={item} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
