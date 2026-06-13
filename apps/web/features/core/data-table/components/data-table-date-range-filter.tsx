"use client";

import type { Column } from "@tanstack/react-table";
import { CalendarIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { ar, enUS } from "react-day-picker/locale";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Separator } from "@workspace/ui/components/separator";
import { useTranslation } from "@workspace/i18n/react";
import { useIsMobile } from "@/hooks/use-mobile";

import type { DataTableDateRangeValue } from "../lib/filter-values";
import {
  isDateRangeValue,
  parseLocalDateStart,
  toYmdLocal,
} from "../lib/filter-values";

type DataTableDateRangeFilterProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
};

function ymdToDateRange(v: unknown): DateRange | undefined {
  if (!isDateRangeValue(v)) return undefined;
  const from = v.from?.trim() ? parseLocalDateStart(v.from.trim()) : undefined;
  const to = v.to?.trim() ? parseLocalDateStart(v.to.trim()) : undefined;
  if (!from && !to) return undefined;
  return { from, to: to ?? from };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function DataTableDateRangeFilter<TData, TValue>({
  column,
  title,
}: DataTableDateRangeFilterProps<TData, TValue>) {
  const { t, locale } = useTranslation();
  const isMobile = useIsMobile();
  const filterVal = column.getFilterValue();
  const filterSig = useMemo(
    () => JSON.stringify(filterVal ?? null),
    [filterVal],
  );

  const [range, setRange] = useState<DateRange | undefined>(() =>
    ymdToDateRange(filterVal),
  );

  useEffect(() => {
    setRange(ymdToDateRange(column.getFilterValue()));
  }, [filterSig, column]);

  // Compact label like "May 3 – May 13" (locale-aware).
  const shortFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  const summary = useMemo(() => {
    if (!isDateRangeValue(filterVal)) return "";
    const a = filterVal.from?.trim();
    const b = filterVal.to?.trim();
    if (!a && !b) return "";
    if (a && b && a === b) return shortFmt.format(parseLocalDateStart(a));
    if (a && b)
      return `${shortFmt.format(parseLocalDateStart(a))} – ${shortFmt.format(parseLocalDateStart(b))}`;
    if (a) return `${shortFmt.format(parseLocalDateStart(a))}…`;
    if (b) return `…${shortFmt.format(parseLocalDateStart(b))}`;
    return "";
  }, [filterVal, shortFmt]);

  const rdpLocale = locale === "ar" ? ar : enUS;

  function commitFromRange(next: DateRange | undefined) {
    if (!next?.from) {
      column.setFilterValue(undefined);
      return;
    }
    const end = next.to ?? next.from;
    column.setFilterValue({
      from: toYmdLocal(next.from),
      to: toYmdLocal(end),
    } satisfies DataTableDateRangeValue);
  }

  function applyPreset(from: Date, to: Date) {
    const next: DateRange = { from: startOfDay(from), to: startOfDay(to) };
    setRange(next);
    commitFromRange(next);
  }

  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);

  const presets = [
    {
      key: "today",
      label: String(t("dataTable.presetToday")),
      onClick: () => applyPreset(today, today),
    },
    {
      key: "yesterday",
      label: String(t("dataTable.presetYesterday")),
      onClick: () => applyPreset(yesterday, yesterday),
    },
    {
      key: "last7",
      label: String(t("dataTable.presetLast7Days")),
      onClick: () => applyPreset(addDays(today, -6), today),
    },
    {
      key: "last30",
      label: String(t("dataTable.presetLast30Days")),
      onClick: () => applyPreset(addDays(today, -29), today),
    },
    {
      key: "thisMonth",
      label: String(t("dataTable.presetThisMonth")),
      onClick: () => {
        const now = new Date();
        applyPreset(
          new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
          today,
        );
      },
    },
  ];

  const active = Boolean(summary);

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className="h-8 border-dashed px-2 text-xs"
    >
      <CalendarIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
      <span>{title}</span>
      {active ? (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-4" />
          <Badge variant="secondary" className="rounded-sm px-1 font-normal">
            {summary}
          </Badge>
        </>
      ) : null}
    </Button>
  );

  const presetsRow = (
    <div className="flex flex-row justify-stretch items-center flex-wrap gap-1 border-b border-border p-2">
      {presets.map((p) => (
        <Button
          key={p.key}
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={p.onClick}
        >
          {p.label}
        </Button>
      ))}
      {active ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setRange(undefined);
            column.setFilterValue(undefined);
          }}
        >
          <XIcon className="text-destructive" />
          {t("dataTable.clear")}
        </Button>
      ) : null}
    </div>
  );

  const calendar = (
    <Calendar
      mode="range"
      locale={rdpLocale}
      numberOfMonths={1}
      defaultMonth={range?.from ?? today}
      selected={range}
      onSelect={(r) => {
        setRange(r);
        if (r?.from && r?.to) {
          commitFromRange(r);
        } else if (r?.from && !r?.to) {
          commitFromRange({ from: r.from, to: r.from });
        } else if (!r) {
          column.setFilterValue(undefined);
        }
      }}
    />
  );

  // Nested popovers (filters sheet → date picker) confuse anchor positioning on
  // small screens / RTL. Use a modal dialog instead so the calendar is always
  // centered in the viewport.
  if (isMobile) {
    return (
      <Dialog>
        <DialogTrigger render={trigger} />
        <DialogContent className="max-h-[min(90dvh,40rem)] w-auto max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-md">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {presetsRow}
          {calendar}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-auto p-0 max-w-min">
        {presetsRow}
        {calendar}
      </PopoverContent>
    </Popover>
  );
}
