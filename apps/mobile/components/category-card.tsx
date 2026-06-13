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
      className="flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 active:bg-muted"
      onPress={() => router.push(`/(customer)/category/${category.id}`)}
    >
      <ItemThumb uri={category.imageUrl} label={name} size={52} />
      <Text className="text-center text-sm font-bold text-foreground">
        {name}
      </Text>
    </Pressable>
  );
}
