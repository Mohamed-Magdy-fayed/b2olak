"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useTranslation } from "@workspace/i18n/react";

type DataTablePaginationProps<T> = {
  table: TanstackTable<T>;
};

const PAGE_SIZES = [10, 20, 50, 100] as const;

export function DataTablePagination<T>({ table }: DataTablePaginationProps<T>) {
  const { t } = useTranslation();
  const page = table.getState().pagination.pageIndex + 1;
  const pageCount = table.getPageCount();
  const totalPages = Math.max(pageCount, 1);
  // Server-driven tables provide `rowCount` directly; client-side ones fall
  // back to the filtered row model so the total reflects active filters.
  const totalRows =
    table.options.rowCount ?? table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col-reverse gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground inline-flex items-center gap-2 text-xs whitespace-nowrap">
        <span>{t("dataTable.totalRows", { count: totalRows })}</span>
        <span aria-hidden className="opacity-50">
          ·
        </span>
        <span>{t("dataTable.pageOf", { page, total: totalPages })}</span>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground md:inline">
            {t("dataTable.rowsPerPage")}
          </span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-[4.5rem] text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={`${n}`}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label={String(t("dataTable.goToFirstPage"))}
          >
            <ChevronsLeftIcon className="size-3.5 rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label={String(t("dataTable.goToPreviousPage"))}
          >
            <ChevronLeftIcon className="size-3.5 rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label={String(t("dataTable.goToNextPage"))}
          >
            <ChevronRightIcon className="size-3.5 rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label={String(t("dataTable.goToLastPage"))}
          >
            <ChevronsRightIcon className="size-3.5 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}
