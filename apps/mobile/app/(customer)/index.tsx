import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { CategoryCard } from "@/components/category-card";
import { ItemHScroll } from "@/components/item-h-scroll";
import { LanguageToggle } from "@/components/language-toggle";
import { Screen } from "@/components/ui/screen";
import { useSignedIn } from "@/lib/auth-gate";
import { useTabBarHeight } from "@/lib/use-tab-bar-height";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function CustomerHome() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const signedIn = useSignedIn();
  const tabBarHeight = useTabBarHeight();

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
    <Screen padded={false}>
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: brand wordmark + language toggle */}
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-1 pe-3">
            <Text className="font-display text-4xl text-primary">
              {t("mobile.welcomeTitle")}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              {t("mobile.welcomeSubtitle")}
            </Text>
          </View>
          <LanguageToggle />
        </View>

        {/* Tappable search bar that navigates to the search tab */}
        <Pressable
          className="mb-6 h-14 w-full flex-row items-center gap-3 rounded-2xl border border-input bg-elevated px-4"
          onPress={() => router.push("/(customer)/search")}
        >
          <Ionicons name="search-outline" size={20} color="#9B968C" />
          <Text className="text-base text-muted-foreground">
            {t("shop.searchPlaceholder")}
          </Text>
        </Pressable>

        {/* Buy again — hidden when empty */}
        <ItemHScroll title={t("shop.buyAgain")} items={reorderItems ?? []} />

        {/* Popular now — hidden when empty */}
        <ItemHScroll title={t("shop.popularNow")} items={popularItems ?? []} />

        {/* Categories grid */}
        <Text className="mb-3 font-display text-xl text-foreground">
          {t("shop.categories")}
        </Text>

        {categoriesLoading ? (
          <ActivityIndicator className="py-12" color="#C9A227" />
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
    </Screen>
  );
}
