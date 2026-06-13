"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { ItemCard } from "@/features/shop/item-card";
import { AddItemDialog } from "@/features/shop/add-item-dialog";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useTranslation();
  const trpc = useTRPC();

  const { data: categories } = useQuery(trpc.catalog.categories.queryOptions());
  const category = categories?.find((c) => c.id === id);

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    trpc.catalog.itemsByCategory.infiniteQueryOptions(
      { categoryId: id, limit: 30 },
      {
        getNextPageParam: (last) => last.nextCursor,
        initialCursor: 0,
      },
    ),
  );

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/shop"
          className="flex size-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          aria-label={t("common.cancel")}
        >
          {locale === "ar" ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Link>
        <h1 className="text-2xl font-black text-foreground">
          {category
            ? locale === "ar"
              ? category.nameAr
              : category.nameEn
            : ""}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {t("shop.noResults")}
        </p>
      ) : (
        <div className="flex flex-col">
          {allItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? t("common.loading") : t("shop.loadMore")}
          </Button>
        </div>
      )}

      <div className="mt-6">
        <AddItemDialog />
      </div>
    </div>
  );
}
