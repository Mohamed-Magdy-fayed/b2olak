import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { CategoryCard } from "@/components/category-card";
import { ItemHScroll } from "@/components/item-h-scroll";
import { LanguageToggle } from "@/components/language-toggle";
import { useSignedIn } from "@/lib/auth-gate";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function CustomerHome() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const signedIn = useSignedIn();

  const { data: categories, isLoading: categoriesLoading } = useQuery(
    trpc.catalog.categories.queryOptions(),
  );
  const { data: popularItems } = useQuery(
    trpc.catalog.popularItems.queryOptions(),
  );
  // "Buy again" is personalised and auth-only — skip it entirely for guests.
  const { data: reorderItems } = useQuery({
    ...trpc.catalog.reorderItems.queryOptions(),
    enabled: signedIn === true,
  });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-16 pb-8"
    >
      {/* Header: title + language toggle */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-3xl font-black text-primary">
          {t("mobile.welcomeTitle")}
        </Text>
        <LanguageToggle />
      </View>

      {/* Tappable search bar that navigates to the search tab */}
      <Pressable
        className="mb-5 h-12 w-full flex-row items-center rounded-xl border border-input bg-card px-4"
        onPress={() => router.push("/(customer)/search")}
      >
        <Text className="text-base text-muted-foreground">
          {t("shop.searchPlaceholder")}
        </Text>
      </Pressable>

      {/* Buy again — hidden when empty */}
      <ItemHScroll
        title={t("shop.buyAgain")}
        items={reorderItems ?? []}
      />

      {/* Popular now — hidden when empty */}
      <ItemHScroll
        title={t("shop.popularNow")}
        items={popularItems ?? []}
      />

      {/* Categories grid */}
      <Text className="mb-3 text-lg font-bold text-foreground">
        {t("shop.categories")}
      </Text>

      {categoriesLoading ? (
        <ActivityIndicator className="py-12" />
      ) : (
        <FlatList
          data={categories ?? []}
          numColumns={2}
          keyExtractor={(c) => c.id}
          columnWrapperClassName="gap-3"
          contentContainerClassName="gap-3"
          scrollEnabled={false}
          renderItem={({ item: category }) => (
            <CategoryCard category={category} />
          )}
        />
      )}
    </ScrollView>
  );
}
