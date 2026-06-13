"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import { getEntityColumnPinning } from "../lib/entity-column-pinning";
import type { DataTableMode } from "../types";

export type DataTableControlledState = {
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  globalFilter: string;
  onGlobalFilterChange: OnChangeFn<string>;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: OnChangeFn<VisibilityState>;
  columnPinning: ColumnPinningState;
  onColumnPinningChange: OnChangeFn<ColumnPinningState>;
};

export type UseDataTableArgs<T> = {
  mode: DataTableMode;
  data: T[];
  columns: ColumnDef<T, unknown>[];
  pageCount?: number;
  /**
   * Total matching row count for server-driven tables. Lets the pagination
   * surface show "X total" even though only the current page is in `data`.
   */
  rowCount?: number;
  getRowId?: (row: T) => string;
  initialColumnPinning?: ColumnPinningState;
  controlled?: DataTableControlledState;
  globalFilterFn?: FilterFn<T>;
};

export function useDataTable<T>({
  mode,
  data,
  columns,
  pageCount = -1,
  rowCount,
  getRowId,
  initialColumnPinning = getEntityColumnPinning(),
  controlled,
  globalFilterFn,
}: UseDataTableArgs<T>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] =
    useState<ColumnPinningState>(initialColumnPinning);

  const resetFirstPage = useCallback((setPag: OnChangeFn<PaginationState>) => {
    setPag((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const handlers = useMemo(() => {
    if (controlled) {
      const {
        onPaginationChange,
        onSortingChange,
        onColumnFiltersChange,
        onGlobalFilterChange,
      } = controlled;
      return {
        onSortingChange: (updater: Updater<SortingState>) => {
          onSortingChange(updater);
          resetFirstPage(onPaginationChange);
        },
        onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
          onColumnFiltersChange(updater);
          resetFirstPage(onPaginationChange);
        },
        onGlobalFilterChange: (updater: Updater<string>) => {
          onGlobalFilterChange(updater);
          resetFirstPage(onPaginationChange);
        },
      };
    }
    return {
      onSortingChange: (updater: Updater<SortingState>) => {
        setSorting(updater);
        resetFirstPage(setPagination);
      },
      onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
        setColumnFilters(updater);
        resetFirstPage(setPagination);
      },
      onGlobalFilterChange: (updater: Updater<string>) => {
        setGlobalFilter((prev) =>
          typeof updater === "function" ? updater(prev) : updater,
        );
        resetFirstPage(setPagination);
      },
    };
  }, [controlled, resetFirstPage]);

  const p = controlled?.pagination ?? pagination;
  const s = controlled?.sorting ?? sorting;
  const cf = controlled?.columnFilters ?? columnFilters;
  const gf = controlled?.globalFilter ?? globalFilter;
  const rs = controlled?.rowSelection ?? rowSelection;
  const cv = controlled?.columnVisibility ?? columnVisibility;
  const cp = controlled?.columnPinning ?? columnPinning;

  const isServer = mode === "server";

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      pagination: p,
      sorting: s,
      columnFilters: cf,
      globalFilter: gf,
      rowSelection: rs,
      columnVisibility: cv,
      columnPinning: cp,
    },
    onPaginationChange: controlled?.onPaginationChange ?? setPagination,
    onSortingChange: handlers.onSortingChange,
    onColumnFiltersChange: handlers.onColumnFiltersChange,
    onGlobalFilterChange: handlers.onGlobalFilterChange,
    onRowSelectionChange: controlled?.onRowSelectionChange ?? setRowSelection,
    onColumnVisibilityChange:
      controlled?.onColumnVisibilityChange ?? setColumnVisibility,
    onColumnPinningChange:
      controlled?.onColumnPinningChange ?? setColumnPinning,
    manualPagination: isServer,
    manualSorting: isServer,
    manualFiltering: isServer,
    pageCount: isServer ? pageCount : undefined,
    rowCount: isServer ? rowCount : undefined,
    enableRowSelection: true,
    enableColumnPinning: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: isServer ? undefined : getFilteredRowModel(),
    getPaginationRowModel: isServer ? undefined : getPaginationRowModel(),
    getSortedRowModel: isServer ? undefined : getSortedRowModel(),
    globalFilterFn,
  });

  return {
    table,
    globalFilter: gf,
    setGlobalFilter: handlers.onGlobalFilterChange,
  };
}
