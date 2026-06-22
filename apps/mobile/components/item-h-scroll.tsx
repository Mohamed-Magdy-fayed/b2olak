import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { cartLineFromItem, type CartUnit, useCart } from "@/lib/cart-store";
import { useTranslation } from "@/lib/i18n";
import { itemDisplayName } from "./item-row";
import { ItemThumb } from "./item-thumb";

type Item = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  imageUrl?: string | null;
  units: CartUnit[];
  defaultUnit: string | null;
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
  const disabled = item.units.length === 0;

  if (line) {
    return (
      <View className="mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-elevated px-2 py-1">
        <Pressable
          className="size-7 items-center justify-center rounded-full bg-card active:opacity-70"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setQty(item.id, line.qty - 1);
          }}
        >
          <Ionicons name="remove" size={14} color="#9B968C" />
        </Pressable>
        <Text className="min-w-5 text-center text-sm font-bold text-foreground">
          {line.qty}
        </Text>
        <Pressable
          className="size-7 items-center justify-center rounded-full bg-primary active:opacity-70"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setQty(item.id, line.qty + 1);
          }}
        >
          <Ionicons name="add" size={14} color="#0E0E10" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      className={`mt-2 rounded-xl px-3 py-2 active:opacity-70 ${disabled ? "bg-elevated" : "bg-primary"}`}
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        add(cartLineFromItem(item));
      }}
    >
      <Text className={`text-center text-xs font-semibold ${disabled ? "text-muted-foreground" : "text-primary-foreground"}`}>
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
    <View className="mb-6">
      <Text className="mb-3 font-display text-xl font-bold text-foreground">{title}</Text>
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
              className="w-[148px] rounded-2xl border border-border bg-card p-3"
            >
              <ItemThumb uri={item.imageUrl} label={name} size={84} />
              <Text
                className="mt-2.5 text-sm font-semibold text-foreground"
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
