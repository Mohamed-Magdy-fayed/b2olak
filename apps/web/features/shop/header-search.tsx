"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { useTranslation } from "@workspace/i18n/react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";

/**
 * Compact search widget for the shop header.
 * On submit (Enter or button press) navigates to /shop/search?q=<value>.
 */
export function HeaderSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const q = value.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    router.push(`/shop/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={t("shop.searchPlaceholder")}
          aria-label={t("shop.searchPlaceholder")}
          className="h-8 w-40 ps-8 text-sm sm:w-52"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label={t("shop.searchPlaceholder")}
        onClick={submit}
      >
        <Search className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
