"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { ItemCard } from "@/features/shop/item-card";
import { AddItemDialog } from "@/features/shop/add-item-dialog";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";

export default function SearchPage() {
  const { t } = useTranslation();
  const trpc = useTRPC();

  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputValue]);

  const { data, isLoading } = useQuery({
    ...trpc.catalog.search.queryOptions({ query: debouncedQuery }),
    enabled: debouncedQuery.length >= 2,
  });

  const items = data?.items ?? [];
  const showResults = debouncedQuery.length >= 2;
  const showAddCta = showResults && !isLoading;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-black text-foreground">
        {t("shop.tabSearch")}
      </h1>

      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={t("shop.searchPlaceholder")}
        className="mb-4"
        autoFocus
      />

      {showResults && isLoading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : showResults && items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {t("shop.noResults")}
        </p>
      ) : (
        <div className="flex flex-col">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {showAddCta && (
        <div className="mt-6">
          <AddItemDialog />
        </div>
      )}
    </div>
  );
}
