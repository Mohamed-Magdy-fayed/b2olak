import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { ItemRow } from "@/components/item-row";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function SearchScreen() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const search = useQuery({
    ...trpc.catalog.search.queryOptions({ query }),
    enabled: query.trim().length >= 2,
  });

  return (
    <View className="flex-1 bg-background px-4 pt-16">
      <Text className="mb-3 text-2xl font-black text-foreground">
        {t("shop.tabSearch")}
      </Text>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t("shop.searchPlaceholder")}
        autoFocus
        className="mb-3"
      />
      <FlatList
        data={search.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemRow item={item} />}
        ListEmptyComponent={
          query.trim().length >= 2 && !search.isLoading ? (
            <Text className="py-12 text-center text-muted-foreground">
              {t("shop.noResults")}
            </Text>
          ) : null
        }
        contentContainerClassName="pb-6"
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
