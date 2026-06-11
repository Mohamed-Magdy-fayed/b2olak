import { FlatList, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { ItemRow } from "@/components/item-row";
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
    <View className="flex-1 bg-background px-4 pt-16">
      <View className="mb-3 flex-row items-center gap-3">
        <Pressable
          className="size-10 items-center justify-center rounded-full bg-muted"
          onPress={() => router.back()}
        >
          <Text className="text-lg">{locale === "ar" ? "→" : "←"}</Text>
        </Pressable>
        <Text className="text-2xl font-black text-foreground">
          {category ? (locale === "ar" ? category.nameAr : category.nameEn) : ""}
        </Text>
      </View>
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemRow item={item} />}
        onEndReached={() => {
          if (items.hasNextPage && !items.isFetchingNextPage) {
            void items.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          items.isLoading ? null : (
            <Text className="py-12 text-center text-muted-foreground">
              {t("shop.noResults")}
            </Text>
          )
        }
        contentContainerClassName="pb-6"
      />
    </View>
  );
}
