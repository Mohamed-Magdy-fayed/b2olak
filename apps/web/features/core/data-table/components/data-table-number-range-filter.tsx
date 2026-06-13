"use client";

import type { Column } from "@tanstack/react-table";
import { HashIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useTranslation } from "@workspace/i18n/react";
import type { DataTableNumberRangeValue } from "../lib/filter-values";
import { isNumberRangeValue } from "../lib/filter-values";

type DataTableNumberRangeFilterProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
};

function parseOptionalInt(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function DataTableNumberRangeFilter<TData, TValue>({
  column,
  title,
}: DataTableNumberRangeFilterProps<TData, TValue>) {
  const { t } = useTranslation();
  const raw = column.getFilterValue();
  const value: DataTableNumberRangeValue = isNumberRangeValue(raw) ? raw : {};

  const [minDraft, setMinDraft] = useState(
    value.min != null ? String(value.min) : "",
  );
  const [maxDraft, setMaxDraft] = useState(
    value.max != null ? String(value.max) : "",
  );

  useEffect(() => {
    setMinDraft(value.min != null ? String(value.min) : "");
    setMaxDraft(value.max != null ? String(value.max) : "");
  }, [value.min, value.max]);

  useEffect(() => {
    const tmr = window.setTimeout(() => {
      const min = parseOptionalInt(minDraft);
      const max = parseOptionalInt(maxDraft);
      if (min == null && max == null) {
        column.setFilterValue(undefined);
        return;
      }
      column.setFilterValue({ min, max });
    }, 300);
    return () => window.clearTimeout(tmr);
  }, [column, minDraft, maxDraft]);

  const active = value.min != null || value.max != null;

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className="flex h-8 max-w-[12rem] items-center justify-start gap-1 border-dashed px-2 text-xs"
    >
      <HashIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
      <span className="truncate">{title}</span>
      {active ? (
        <span className="ms-1 truncate text-muted-foreground">
          {value.min ?? "…"}–{value.max ?? "…"}
        </span>
      ) : null}
    </Button>
  );

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-56 gap-2 p-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[0.65rem] text-muted-foreground">
              {String(t("dataTable.numberMin"))}
            </Label>
            <Input
              inputMode="numeric"
              className="h-8 text-xs"
              value={minDraft}
              onChange={(e) => setMinDraft(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[0.65rem] text-muted-foreground">
              {String(t("dataTable.numberMax"))}
            </Label>
            <Input
              inputMode="numeric"
              className="h-8 text-xs"
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
            />
          </div>
        </div>
        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => {
              setMinDraft("");
              setMaxDraft("");
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
