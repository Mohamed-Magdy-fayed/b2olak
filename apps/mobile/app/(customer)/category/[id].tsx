import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { ItemRow } from "@/components/item-row";
import { Button } from "@/components/ui/button";
import { Screen, ScreenBackHeader } from "@/components/ui/screen";
import { ItemRowListSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function CategoryScreen() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: categories } = useQuery(trpc.catalog.categories.queryOptions());
  const category = categories?.find((c) => c.id === id);

  const items = useInfiniteQuery(
    trpc.catalog.itemsByCategory.infiniteQueryOptions(
      { categoryId: id!, limit: 30 },
      {
        getNextPageParam: (last) => last.nextCursor,
        initialCursor: 0,
        enabled: !!id,
      },
    ),
  );

  const allItems = items.data?.pages.flatMap((p) => p.items) ?? [];

  if (items.error) {
    return (
      <Screen className="items-center justify-center gap-4">
        <ScreenBackHeader title=" " className="px-4" />
        <Text className="text-center text-foreground">{t("common.error")}</Text>
        <Button label={t("common.retry")} onPress={() => void items.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScreenBackHeader
        title={category ? ((locale === "ar" ? category.nameAr : category.nameEn) ?? "") : " "}
        className="px-4"
      />
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemRow item={item} />}
        onEndReached={() => {
          if (items.hasNextPage && !items.isFetchingNextPage) {
            void items.fetchNextPage();
          }
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          items.isLoading ? (
            <ItemRowListSkeleton count={8} />
          ) : (
            <Text className="py-12 text-center text-muted-foreground">
              {t("shop.noResults")}
            </Text>
          )
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
      />
    </Screen>
  );
}
