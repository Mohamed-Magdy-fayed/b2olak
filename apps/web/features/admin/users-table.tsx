"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnPinningState,
  RowSelectionState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
import { DownloadIcon, UserCheckIcon, UserXIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useTranslation } from "@workspace/i18n/react";

import {
  DataTable,
  DataTableActionBar,
  type DataTableControlledState,
  DataTableDateRangeFilter,
  DataTableExportButton,
  DataTableFacetedFilter,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  downloadCsv,
  EntityPageHeader,
  getEntityColumnPinning,
  rowsToCsv,
  serializeColumnFiltersForServer,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
import { useTRPC } from "@/lib/trpc/client";
import { buildUserColumns, type UserRow } from "./users-columns";

export type UserRowAction = {
  row: UserRow;
  variant: "suspend" | "reactivate";
} | null;

export function UsersTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();

  const {
    pagination,
    sorting,
    columnFilters,
    globalFilter,
    setPagination,
    setSorting,
    setColumnFilters,
    setGlobalFilter,
  } = useTableUrlState({ page: 1, perPage: 20 });

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [rowAction, setRowAction] = useState<UserRowAction>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() =>
    getEntityColumnPinning(),
  );

  const listInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
      sorting,
      columnFilters: serializeColumnFiltersForServer(columnFilters),
      globalFilter: globalFilter || undefined,
    }),
    [columnFilters, globalFilter, pagination.pageIndex, pagination.pageSize, sorting],
  );

  const { data, isFetching } = useQuery(
    trpc.admin.users.list.queryOptions(listInput),
  );

  const controlled = useMemo<DataTableControlledState>(
    () => ({
      pagination,
      onPaginationChange: setPagination,
      sorting,
      onSortingChange: setSorting,
      columnFilters,
      onColumnFiltersChange: setColumnFilters,
      globalFilter,
      onGlobalFilterChange: setGlobalFilter,
      rowSelection,
      onRowSelectionChange: setRowSelection,
      columnVisibility,
      onColumnVisibilityChange: setColumnVisibility,
      columnPinning,
      onColumnPinningChange: setColumnPinning,
    }),
    [
      pagination,
      setPagination,
      sorting,
      setSorting,
      columnFilters,
      setColumnFilters,
      globalFilter,
      setGlobalFilter,
      rowSelection,
      columnVisibility,
      columnPinning,
    ],
  );

  const columns = useMemo(
    () => buildUserColumns({ locale, t, setRowAction }),
    [locale, t],
  );

  const {
    table,
    globalFilter: resolvedGlobalFilter,
    setGlobalFilter: setResolvedGlobalFilter,
  } = useDataTable({
    mode: "server",
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    rowCount: data?.total ?? 0,
    columns,
    getRowId: (row) => row.id,
    controlled,
  });

  const invalidate = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: trpc.admin.users.list.queryKey(),
      }),
    [queryClient, trpc],
  );

  const setStatus = useMutation(
    trpc.admin.users.setStatus.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setRowAction(null);
      },
    }),
  );

  // Handle single-row actions immediately (no confirmation dialog needed —
  // the confirmation is shown in the action bar bulk flow).
  useMemo(() => {
    if (!rowAction) return;
    if (rowAction.variant === "suspend") {
      if (window.confirm(String(t("admin.users.suspendConfirm")))) {
        setStatus.mutate({ userIds: [rowAction.row.id], status: "suspended" });
      } else {
        setRowAction(null);
      }
    } else if (rowAction.variant === "reactivate") {
      setStatus.mutate({ userIds: [rowAction.row.id], status: "active" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowAction]);

  const fetchAllRows = useCallback(async (): Promise<UserRow[]> => {
    const result = await queryClient.fetchQuery(
      trpc.admin.users.exportRows.queryOptions({
        sorting,
        columnFilters: serializeColumnFiltersForServer(columnFilters),
        globalFilter: globalFilter || undefined,
      }),
    );
    // exportRows returns a flat CSV shape; map it back to UserRow so the
    // shared getExportRow can re-derive the same columns uniformly.
    return result.rows.map((r) => ({
      id: "",
      name: r.name || null,
      phone: r.phone || null,
      email: r.email || null,
      status: r.status,
      preferredLocale: r.locale || null,
      phoneVerifiedAt: r.phoneVerified ? new Date() : null,
      lastSignInAt: r.lastSignInAt ? new Date(r.lastSignInAt) : null,
      createdAt: new Date(r.createdAt),
    }));
  }, [columnFilters, globalFilter, queryClient, sorting, trpc]);

  const userStatusOptions = [
    { value: "active", label: String(t("admin.common.active")) },
    { value: "suspended", label: String(t("admin.drivers.statusSuspended")) },
  ];

  const localeOptions = [
    { value: "en", label: "EN" },
    { value: "ar", label: "العربية" },
  ];

  const phoneVerifiedOptions = [
    { value: "true", label: String(t("admin.users.verified")) },
    { value: "false", label: String(t("admin.users.notVerified")) },
  ];

  const statusColumn = table.getColumn("status");
  const preferredLocaleColumn = table.getColumn("preferredLocale");
  const phoneVerifiedAtColumn = table.getColumn("phoneVerifiedAt");
  const createdAtColumn = table.getColumn("createdAt");
  const lastSignInAtColumn = table.getColumn("lastSignInAt");

  return (
    <div
      className={
        isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"
      }
    >
      <EntityPageHeader title={String(t("admin.users.title"))} />

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(value) => setResolvedGlobalFilter(value)}
            searchPlaceholder={String(t("dataTable.searchCustomersHint"))}
            filterSlot={
              <>
                {statusColumn ? (
                  <DataTableFacetedFilter
                    column={statusColumn}
                    title={String(t("admin.items.status"))}
                    options={userStatusOptions}
                  />
                ) : null}
                {phoneVerifiedAtColumn ? (
                  <DataTableFacetedFilter
                    column={phoneVerifiedAtColumn}
                    title={String(t("admin.users.verified"))}
                    options={phoneVerifiedOptions}
                  />
                ) : null}
                {preferredLocaleColumn ? (
                  <DataTableFacetedFilter
                    column={preferredLocaleColumn}
                    title={String(t("admin.users.locale"))}
                    options={localeOptions}
                  />
                ) : null}
                {createdAtColumn ? (
                  <DataTableDateRangeFilter
                    column={createdAtColumn}
                    title={String(t("admin.users.created"))}
                  />
                ) : null}
                {lastSignInAtColumn ? (
                  <DataTableDateRangeFilter
                    column={lastSignInAtColumn}
                    title={String(t("admin.users.lastSignIn"))}
                  />
                ) : null}
              </>
            }
          >
            <DataTableViewOptions table={table} />
            <DataTableExportButton
              table={table}
              exportFileName="customers.csv"
              fetchAllRows={fetchAllRows}
              getExportRow={(row) => ({
                name: row.name ?? "",
                phone: row.phone ?? "",
                email: row.email ?? "",
                status: row.status,
                locale: row.preferredLocale ?? "",
                phoneVerified: row.phoneVerifiedAt !== null,
                lastSignInAt: row.lastSignInAt
                  ? new Date(row.lastSignInAt).toISOString()
                  : "",
                createdAt:
                  row.createdAt instanceof Date
                    ? row.createdAt.toISOString()
                    : String(row.createdAt),
              })}
            />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <UsersBulkActions
              table={table}
              onBulkSuspend={(ids) => {
                if (window.confirm(String(t("admin.users.suspendConfirm")))) {
                  setStatus.mutate({ userIds: ids, status: "suspended" });
                }
              }}
              onBulkReactivate={(ids) => {
                setStatus.mutate({ userIds: ids, status: "active" });
              }}
              isPending={setStatus.isPending}
            />
          </DataTableActionBar>
        }
      />
    </div>
  );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function UsersBulkActions({
  table,
  onBulkSuspend,
  onBulkReactivate,
  isPending,
}: {
  table: Table<UserRow>;
  onBulkSuspend: (ids: string[]) => void;
  onBulkReactivate: (ids: string[]) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();

  function getSelectedIds() {
    return table
      .getFilteredSelectedRowModel()
      .rows.map((r) => r.original.id);
  }

  function exportSelected() {
    const rows = table.getFilteredSelectedRowModel().rows;
    if (!rows.length) return;
    const headers = [
      "name",
      "phone",
      "email",
      "status",
      "locale",
      "phoneVerified",
      "lastSignInAt",
      "createdAt",
    ] as const;
    const csv = rowsToCsv(
      [...headers],
      rows.map((r) => ({
        name: r.original.name ?? "",
        phone: r.original.phone ?? "",
        email: r.original.email ?? "",
        status: r.original.status,
        locale: r.original.preferredLocale ?? "",
        phoneVerified: r.original.phoneVerifiedAt !== null,
        lastSignInAt: r.original.lastSignInAt
          ? new Date(r.original.lastSignInAt).toISOString()
          : "",
        createdAt:
          r.original.createdAt instanceof Date
            ? r.original.createdAt.toISOString()
            : String(r.original.createdAt),
      })),
    );
    downloadCsv("customers-selected.csv", csv);
    table.resetRowSelection();
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isPending}
              onClick={() => onBulkSuspend(getSelectedIds())}
              aria-label={String(t("admin.users.suspend"))}
            >
              <UserXIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("admin.users.suspend"))}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isPending}
              onClick={() => onBulkReactivate(getSelectedIds())}
              aria-label={String(t("admin.users.reactivate"))}
            >
              <UserCheckIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("admin.users.reactivate"))}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={exportSelected}
              aria-label={String(t("dataTable.export.export"))}
            >
              <DownloadIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("dataTable.export.export"))}</TooltipContent>
      </Tooltip>
    </>
  );
}
