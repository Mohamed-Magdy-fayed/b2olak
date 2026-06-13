"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { ItemCardRow } from "@/features/shop/item-card";
import { AddItemDialog } from "@/features/shop/add-item-dialog";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";

const RECENT_KEY = "ba2olak-recent-searches";
const MAX_RECENT = 6;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveRecent(terms: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(terms));
  } catch {
    // ignore
  }
}

function pushRecent(term: string, prev: string[]): string[] {
  const trimmed = term.trim();
  if (!trimmed) return prev;
  const deduped = [trimmed, ...prev.filter((t) => t !== trimmed)].slice(
    0,
    MAX_RECENT,
  );
  saveRecent(deduped);
  return deduped;
}

export default function SearchPage() {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const searchParams = useSearchParams();

  // Initialize from URL ?q= param
  const initialQ = searchParams.get("q") ?? "";

  const [inputValue, setInputValue] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    setRecentSearches(loadRecent());
  }, []);

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

  // Record the search term when results arrive (≥2 chars and response received)
  useEffect(() => {
    if (debouncedQuery.length >= 2 && data !== undefined) {
      setRecentSearches((prev) => pushRecent(debouncedQuery, prev));
    }
  }, [debouncedQuery, data]);

  const applyRecent = useCallback((term: string) => {
    setInputValue(term);
    setDebouncedQuery(term);
  }, []);

  const clearRecent = useCallback(() => {
    saveRecent([]);
    setRecentSearches([]);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-black text-foreground">
        {t("shop.tabSearch")}
      </h1>

      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={t("shop.searchPlaceholder")}
        aria-label={t("shop.searchPlaceholder")}
        className="mb-4"
        autoFocus
      />

      {/* Empty state: hint + recent chips */}
      {!showResults && (
        <div>
          {recentSearches.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("shop.recentSearches")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-0.5 text-xs text-muted-foreground"
                  onClick={clearRecent}
                >
                  <X className="me-1 size-3" aria-hidden="true" />
                  {t("shop.clearRecent")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <Badge
                    key={term}
                    variant="secondary"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => applyRecent(term)}
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              {t("shop.searchEmptyHint")}
            </p>
          )}
        </div>
      )}

      {/* Search results */}
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
            <ItemCardRow key={item.id} item={item} />
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
