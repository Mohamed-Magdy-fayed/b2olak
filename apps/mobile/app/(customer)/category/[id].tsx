import { FlatList, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { ItemRow } from "@/components/item-row";
import { Screen, ScreenBackHeader } from "@/components/ui/screen";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function CategoryScreen() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
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

  return (
    <Screen padded={false}>
      <ScreenBackHeader
        title={category ? ((locale === "ar" ? category.nameAr : category.nameEn) ?? "") : ""}
        className="px-5"
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
        ListEmptyComponent={
          items.isLoading ? null : (
            <Text className="py-12 text-center text-muted-foreground">
              {t("shop.noResults")}
            </Text>
          )
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      />
    </Screen>
  );
}
