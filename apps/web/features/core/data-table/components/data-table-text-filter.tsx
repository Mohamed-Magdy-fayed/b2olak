"use client";

import type { Column } from "@tanstack/react-table";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useTranslation } from "@workspace/i18n/react";

type DataTableTextFilterProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  placeholder?: string;
  debounceMs?: number;
};

export function DataTableTextFilter<TData, TValue>({
  column,
  title,
  placeholder,
  debounceMs = 400,
}: DataTableTextFilterProps<TData, TValue>) {
  const { t } = useTranslation();
  const current = (column.getFilterValue() as string | undefined) ?? "";
  const [draft, setDraft] = useState(current);

  useEffect(() => {
    setDraft(current);
  }, [current]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = draft.trim();
      column.setFilterValue(next.length ? next : undefined);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [column, debounceMs, draft]);

  const active = Boolean(current);

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className="flex h-8 max-w-[11rem] items-center justify-start gap-1 border-dashed px-2 text-xs"
    >
      <SearchIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
      <span className="truncate">{title}</span>
      {active ? (
        <span className="ms-1 truncate text-muted-foreground">: {current}</span>
      ) : null}
    </Button>
  );

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-64 gap-2 p-2">
        <Input
          className="h-8 text-xs"
          placeholder={placeholder ?? title}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => {
              setDraft("");
              column.setFilterValue(undefined);
            }}
          >
            {String(t("dataTable.clear"))}
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
