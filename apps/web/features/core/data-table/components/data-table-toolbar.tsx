"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { FilterIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useTranslation } from "@workspace/i18n/react";

type DataTableToolbarProps<T> = {
  table: TanstackTable<T>;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  /** Overrides the default search placeholder */
  searchPlaceholder?: string;
  /** Right-side tools (view options, export, import, add new…) */
  children?: ReactNode;
  /**
   * Filter triggers rendered as a fragment of side-by-side controls.
   * On `xl+` they appear inline next to the search input; on smaller
   * screens they collapse into a single "Filters" popover that stacks
   * the same controls vertically.
   */
  filterSlot?: ReactNode;
};

function ToolbarSearchInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      className="h-8 w-full min-w-0 max-w-full sm:w-[18rem]"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ToolbarResetButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className="h-8 border-dashed px-2 text-xs"
      onClick={onClick}
    >
      {label}
      <XIcon className="ms-1 size-3.5" />
    </Button>
  );
}

export function DataTableToolbar<T>({
  table,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder,
  children,
  filterSlot,
}: DataTableToolbarProps<T>) {
  const { t } = useTranslation();
  const placeholder = searchPlaceholder ?? String(t("dataTable.searchRows"));

  const activeColumnFilterCount = table.getState().columnFilters.length;
  const activeFilterCount = activeColumnFilterCount + (globalFilter ? 1 : 0);
  const isFiltered = activeFilterCount > 0;

  const resetFilters = () => {
    table.resetColumnFilters();
    onGlobalFilterChange("");
  };

  const resetButton = isFiltered ? (
    <ToolbarResetButton
      label={String(t("dataTable.reset"))}
      onClick={resetFilters}
    />
  ) : null;

  const collapsedFilters = (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="h-8 border-dashed px-2 text-xs"
          >
            <FilterIcon className="size-3.5" />
            {String(t("dataTable.filters"))}
            {activeFilterCount > 0 ? (
              <Badge
                variant="secondary"
                className="ms-1 rounded-sm px-1 font-normal"
              >
                {activeFilterCount}
              </Badge>
            ) : null}
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] gap-2 p-2"
      >
        <div className="flex flex-col gap-2 *:w-full *:justify-start">
          <ToolbarSearchInput
            placeholder={placeholder}
            value={globalFilter}
            onChange={onGlobalFilterChange}
          />
          {filterSlot}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex w-full min-w-0 items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {/* CSS breakpoints avoid a desktop layout flash before hydration. */}
        <div className="hidden xl:flex xl:flex-wrap xl:items-center xl:gap-2">
          <ToolbarSearchInput
            placeholder={placeholder}
            value={globalFilter}
            onChange={onGlobalFilterChange}
          />
          {filterSlot}
        </div>

        <div className="xl:hidden">{collapsedFilters}</div>

        {resetButton}
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-1">{children}</div>
      ) : null}
    </div>
  );
}
