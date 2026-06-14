import { Pressable, Text } from "react-native";
import { router } from "expo-router";

import { useTranslation } from "@/lib/i18n";
import { ItemThumb } from "./item-thumb";

type Category = {
  id: string;
  nameEn: string;
  nameAr: string;
  imageUrl?: string | null;
};

type CategoryCardProps = {
  category: Category;
};

/** Tappable card showing the category image (or letter fallback) and name. */
export function CategoryCard({ category }: CategoryCardProps) {
  const { locale } = useTranslation();
  const name = locale === "ar" ? category.nameAr : category.nameEn;

  return (
    <Pressable
      className="flex-1 items-center justify-center gap-3 rounded-2xl border border-border bg-card p-5 active:bg-elevated"
      onPress={() => router.push(`/(customer)/category/${category.id}`)}
    >
      <ItemThumb uri={category.imageUrl} label={name} size={56} />
      <Text className="font-display text-center text-sm font-bold text-foreground" numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
}
