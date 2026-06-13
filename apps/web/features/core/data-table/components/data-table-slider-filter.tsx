"use client";

import type { Column } from "@tanstack/react-table";
import { HashIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Separator } from "@workspace/ui/components/separator";
import { Slider } from "@workspace/ui/components/slider";
import { useTranslation } from "@workspace/i18n/react";

import type { DataTableNumberRangeValue } from "../lib/filter-values";
import { isNumberRangeValue } from "../lib/filter-values";

type DataTableSliderFilterProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  min: number;
  max: number;
  step?: number;
};

export function DataTableSliderFilter<TData, TValue>({
  column,
  title,
  min,
  max,
  step = 1,
}: DataTableSliderFilterProps<TData, TValue>) {
  const { t } = useTranslation();
  const filterVal = column.getFilterValue();
  const stored: DataTableNumberRangeValue = isNumberRangeValue(filterVal)
    ? filterVal
    : {};

  const initial = useMemo<[number, number]>(
    () => [stored.min ?? min, stored.max ?? max],
    // Only initialise once from external state; updates flow through useEffect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [value, setValue] = useState<[number, number]>(initial);

  useEffect(() => {
    const a = stored.min ?? min;
    const b = stored.max ?? max;
    if (a !== value[0] || b !== value[1]) {
      setValue([a, b]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored.min, stored.max, min, max]);

  function commit([a, b]: [number, number]) {
    const isFullRange = a <= min && b >= max;
    if (isFullRange) {
      column.setFilterValue(undefined);
      return;
    }
    column.setFilterValue({ min: a, max: b });
  }

  const active = stored.min != null || stored.max != null;
  const labelSummary = active ? `${value[0]} – ${value[1]}` : "";

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className="h-8 border-dashed px-2 text-xs"
    >
      <HashIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
      <span>{title}</span>
      {labelSummary ? (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-4" />
          <Badge variant="secondary" className="rounded-sm px-1 font-normal">
            {labelSummary}
          </Badge>
        </>
      ) : null}
    </Button>
  );

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium">{title}</span>
          {active ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[0.65rem]"
              onClick={() => {
                setValue([min, max]);
                column.setFilterValue(undefined);
              }}
            >
              {String(t("dataTable.clear"))}
            </Button>
          ) : null}
        </div>
        <div className="w-full" dir="ltr">
          <Slider
            value={value}
            min={min}
            max={max}
            step={step}
            minStepsBetweenValues={1}
            onValueChange={(v) => {
              if (Array.isArray(v) && v.length === 2) {
                setValue([v[0] as number, v[1] as number]);
              }
            }}
            onValueCommitted={(v) => {
              if (Array.isArray(v) && v.length === 2) {
                commit([v[0] as number, v[1] as number]);
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between text-[0.65rem] text-muted-foreground">
            <span>
              {String(t("dataTable.numberMin"))}: {value[0]}
            </span>
            <span>
              {String(t("dataTable.numberMax"))}: {value[1]}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
