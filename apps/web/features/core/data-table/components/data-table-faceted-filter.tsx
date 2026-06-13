"use client";

import type { Column } from "@tanstack/react-table";
import { PlusCircleIcon } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { useTranslation } from "@workspace/i18n/react";

type DataTableFacetedFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>;
  title: string;
  options: { label: string; value: string }[];
};

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const { t } = useTranslation();
  if (!column) return null;

  const raw = column.getFilterValue() as string[] | undefined;
  const selected = new Set(raw ?? []);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed px-2 text-xs"
          >
            <PlusCircleIcon className="size-3.5" />
            {title}
            {selected.size > 0 ? (
              <>
                <Separator orientation="vertical" className="mx-0.5 h-4" />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal lg:hidden"
                >
                  {selected.size}
                </Badge>
                <div className="hidden gap-1 lg:flex">
                  {selected.size > 2 ? (
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {String(
                        t("dataTable.selected", { count: selected.size }),
                      )}
                    </Badge>
                  ) : (
                    options
                      .filter((o) => selected.has(o.value))
                      .map((o) => (
                        <Badge
                          key={o.value}
                          variant="secondary"
                          className="rounded-sm px-1 font-normal"
                        >
                          {o.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            ) : null}
          </Button>
        }
      />
      <PopoverContent className="w-52 p-0" align="start">
        <ScrollArea className="max-h-[min(60dvh,16rem)]">
          <div className="flex flex-col gap-1 p-2">
            {options.map((opt) => {
              const is = selected.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border border-border accent-primary"
                    checked={is}
                    onChange={() => {
                      const next = new Set(selected);
                      if (is) next.delete(opt.value);
                      else next.add(opt.value);
                      const arr = [...next];
                      column.setFilterValue(arr.length ? arr : undefined);
                    }}
                  />
                  <span className="min-w-0 truncate">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </ScrollArea>
        {selected.size ? (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-center text-xs"
              type="button"
              onClick={() => column.setFilterValue(undefined)}
            >
              {String(t("dataTable.clearFilter", { title }))}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
