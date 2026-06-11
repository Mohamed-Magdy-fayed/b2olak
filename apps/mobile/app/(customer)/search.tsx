import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ItemRow } from "@/components/item-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useCart } from "@/lib/cart-store";
import { useTRPC } from "@/lib/trpc";

const UNITS = ["piece", "kg", "gram", "liter", "pack"] as const;

export default function SearchScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const addToCart = useCart((s) => s.add);

  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("piece");
  const [feedback, setFeedback] = useState<string | null>(null);

  const search = useQuery({
    ...trpc.catalog.search.queryOptions({ query }),
    enabled: query.trim().length >= 2,
  });
  const { data: categories } = useQuery(trpc.catalog.categories.queryOptions());

  const createItem = useMutation(
    trpc.items.create.mutationOptions({
      onSuccess: (data) => {
        setAdding(false);
        setFeedback(
          data.matched ? t("shop.addItem.foundExisting") : t("shop.addItem.added"),
        );
        addToCart({
          itemId: data.item.id,
          nameEn: data.item.nameEn,
          nameAr: data.item.nameAr,
          unit: data.item.defaultUnit,
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.catalog.search.queryKey(),
        });
      },
      onError: (err) => {
        setFeedback(
          err.message === "errors.tooManyRequests"
            ? t("errors.tooManyRequests")
            : t("errors.unknown"),
        );
      },
    }),
  );

  const showAddCta =
    query.trim().length >= 2 && !search.isLoading && !adding;

  return (
    <View className="flex-1 bg-background px-4 pt-16">
      <Text className="mb-3 text-2xl font-black text-foreground">
        {t("shop.tabSearch")}
      </Text>
      <Input
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setFeedback(null);
          setAdding(false);
        }}
        placeholder={t("shop.searchPlaceholder")}
        className="mb-3"
      />

      {feedback ? (
        <Card className="mb-3 border-success">
          <Text className="font-semibold text-success">{feedback}</Text>
        </Card>
      ) : null}

      {adding ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 pb-6"
          keyboardShouldPersistTaps="handled"
        >
          <Card className="gap-3">
            <Text className="text-lg font-bold text-foreground">
              {t("shop.addItem.title")}: “{query.trim()}”
            </Text>
            <Text className="font-medium text-foreground">
              {t("shop.addItem.category")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(categories ?? []).map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  className={`rounded-full border px-3 py-1.5 ${
                    categoryId === category.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <Text
                    className={
                      categoryId === category.id
                        ? "font-semibold text-primary"
                        : "text-foreground"
                    }
                  >
                    {locale === "ar" ? category.nameAr : category.nameEn}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="font-medium text-foreground">
              {t("shop.addItem.unit")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  className={`rounded-full border px-3 py-1.5 ${
                    unit === u
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <Text
                    className={
                      unit === u
                        ? "font-semibold text-primary"
                        : "text-foreground"
                    }
                  >
                    {t(`units.${u}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Button
              label={
                createItem.isPending
                  ? t("shop.addItem.adding")
                  : t("shop.addItem.submit")
              }
              loading={createItem.isPending}
              disabled={!categoryId}
              onPress={() => {
                if (!categoryId) return;
                createItem.mutate({
                  name: query.trim(),
                  categoryId,
                  defaultUnit: unit,
                });
              }}
            />
            <Button
              variant="ghost"
              label={t("common.cancel")}
              onPress={() => setAdding(false)}
            />
          </Card>
        </ScrollView>
      ) : (
        <FlatList
          data={search.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ItemRow item={item} />}
          ListEmptyComponent={
            query.trim().length >= 2 && !search.isLoading ? (
              <Text className="py-8 text-center text-muted-foreground">
                {t("shop.noResults")}
              </Text>
            ) : null
          }
          ListFooterComponent={
            showAddCta ? (
              <Pressable
                className="mt-2 items-center rounded-xl border border-dashed border-primary p-4"
                onPress={() => {
                  setFeedback(null);
                  setAdding(true);
                }}
              >
                <Text className="font-bold text-primary">
                  ➕ {t("shop.addItem.cta")}
                </Text>
              </Pressable>
            ) : null
          }
          contentContainerClassName="pb-6"
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}
