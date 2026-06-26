import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { formatQty, stepForKind } from "@workspace/validators/units";

import { cartLineUnit, type CartUnit, useCart } from "@/lib/cart-store";
import { useTranslation } from "@/lib/i18n";
import { itemDisplayName } from "./item-row";
import { QuantityUnitSheet } from "./quantity-unit-sheet";
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

/** Small add/stepper button reusing the same cart store + picker as ItemRow. */
function CompactAddButton({ item }: { item: Item }) {
  const { t } = useTranslation();
  const line = useCart((s) => s.lines.find((l) => l.itemId === item.id));
  const setQty = useCart((s) => s.setQty);
  const [sheetOpen, setSheetOpen] = useState(false);
  const disabled = item.units.length === 0;

  const lineUnit = line ? cartLineUnit(line) : undefined;
  const step = stepForKind(lineUnit?.kind ?? "count");

  return (
    <>
      {line ? (
        <View className="mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-elevated px-2 py-1">
          <Pressable
            className="size-7 items-center justify-center rounded-full bg-card active:opacity-70"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQty(item.id, line.qty - step);
            }}
          >
            <Ionicons name="remove" size={14} color="#9B968C" />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => setSheetOpen(true)}>
            <Text className="min-w-5 text-center text-sm font-bold text-foreground">
              {formatQty(line.qty, lineUnit?.kind ?? "count")}
            </Text>
          </Pressable>
          <Pressable
            className="size-7 items-center justify-center rounded-full bg-primary active:opacity-70"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQty(item.id, line.qty + step);
            }}
          >
            <Ionicons name="add" size={14} color="#0E0E10" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          className={`mt-2 rounded-xl px-3 py-2 active:opacity-70 ${disabled ? "bg-elevated" : "bg-primary"}`}
          disabled={disabled}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSheetOpen(true);
          }}
        >
          <Text className={`text-center text-xs font-semibold ${disabled ? "text-muted-foreground" : "text-primary-foreground"}`}>
            {t("shop.addToCart")}
          </Text>
        </Pressable>
      )}

      {sheetOpen ? (
        <QuantityUnitSheet
          item={item}
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          initialUnitId={line?.unitId}
          initialQty={line?.qty}
        />
      ) : null}
    </>
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
