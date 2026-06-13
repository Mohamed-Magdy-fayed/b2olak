"use client";

import type { Column } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  EyeOffIcon,
  PinIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useTranslation } from "@workspace/i18n/react";

type DataTableColumnHeaderProps<T, TValue> = {
  column: Column<T, TValue>;
  title: string;
};

export function DataTableColumnHeader<T, TValue>({
  column,
  title,
}: DataTableColumnHeaderProps<T, TValue>) {
  const { t } = useTranslation();
  const sorted = column.getIsSorted();
  const canSort = column.getCanSort();
  const canPin = column.getCanPin();
  const canHide = column.getCanHide();

  if (!canSort && !canPin && !canHide) {
    return <span className="text-xs font-medium">{title}</span>;
  }

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className="-ms-2 h-8 px-2 text-xs font-medium data-[popup-open]:bg-muted"
    >
      <span>{title}</span>
      {canSort ? (
        sorted === "desc" ? (
          <ArrowDownIcon className="ms-1 size-3" />
        ) : sorted === "asc" ? (
          <ArrowUpIcon className="ms-1 size-3" />
        ) : (
          <ChevronsUpDownIcon className="ms-1 size-3 opacity-50" />
        )
      ) : null}
    </Button>
  );

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="start" className="w-44">
          {canSort ? (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <ArrowUpIcon className="size-3.5" />
                {t("dataTable.asc")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <ArrowDownIcon className="size-3.5" />
                {t("dataTable.desc")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {canPin ? (
            <>
              <DropdownMenuItem
                onClick={() => {
                  column.pin(column.getIsPinned() === "left" ? false : "left");
                }}
              >
                <PinIcon className="size-3.5" />
                {column.getIsPinned() === "left"
                  ? t("dataTable.unpin")
                  : t("dataTable.pinLeft")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  column.pin(
                    column.getIsPinned() === "right" ? false : "right",
                  );
                }}
              >
                <PinIcon className="size-3.5 rotate-90" />
                {column.getIsPinned() === "right"
                  ? t("dataTable.unpin")
                  : t("dataTable.pinRight")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {canHide ? (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOffIcon className="size-3.5" />
              {t("dataTable.hide")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
