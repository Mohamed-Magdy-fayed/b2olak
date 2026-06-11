import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function CustomerHome() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
  const { data: categories } = useQuery(trpc.catalog.categories.queryOptions());

  return (
    <View className="flex-1 bg-background px-4 pt-16">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-3xl font-black text-primary">
          {t("mobile.welcomeTitle")}
        </Text>
        <LanguageToggle />
      </View>
      <Text className="mb-3 text-lg font-bold text-foreground">
        {t("shop.categories")}
      </Text>
      <FlatList
        data={categories ?? []}
        numColumns={2}
        keyExtractor={(c) => c.id}
        columnWrapperClassName="gap-3"
        contentContainerClassName="gap-3 pb-6"
        renderItem={({ item: category }) => (
          <Pressable
            className="flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 active:bg-muted"
            onPress={() => router.push(`/(customer)/category/${category.id}`)}
          >
            <Text className="text-center text-base font-bold text-foreground">
              {locale === "ar" ? category.nameAr : category.nameEn}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
