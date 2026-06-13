"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { Settings2Icon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useTranslation } from "@workspace/i18n/react";

type DataTableViewOptionsProps<T> = {
  table: TanstackTable<T>;
};

export function DataTableViewOptions<T>({
  table,
}: DataTableViewOptionsProps<T>) {
  const { t } = useTranslation();
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  className="size-8"
                  aria-label={String(t("dataTable.toggleColumns"))}
                >
                  <Settings2Icon className="size-3.5" />
                </Button>
              }
            />
          }
        />
        <TooltipContent>{String(t("dataTable.toggleColumns"))}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {String(t("dataTable.toggleColumns"))}
          </DropdownMenuLabel>
          {hideable.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(v) => column.toggleVisibility(!!v)}
            >
              {(column.columnDef.meta as { label?: string } | undefined)
                ?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
