"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnPinningState,
  RowSelectionState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { DownloadIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { AppRouter } from "@workspace/api/root";
import { useTranslation } from "@workspace/i18n/react";
import { toast } from "sonner";

import {
  DataTable,
  DataTableActionBar,
  type DataTableControlledState,
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
  DataTableNumberRangeFilter,
  DataTablePagination,
  DataTableTextFilter,
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
import { buildOrderColumns, type OrderRow } from "./orders-columns";

type RouterOutput = inferRouterOutputs<AppRouter>;
type OrderExportRow =
  RouterOutput["admin"]["orders"]["exportRows"]["rows"][number];

export type OrderRowAction = {
  row: OrderRow;
  variant: "assign" | "cancel";
} | null;

const ORDER_STATUSES = [
  "placed",
  "assigned",
  "shopping",
  "purchased",
  "delivering",
  "delivered",
  "cancelled",
] as const;

// ─── Standalone export button ─────────────────────────────────────────────────

function OrdersExportButton({
  table,
  fetchAllExportRows,
}: {
  table: Table<OrderRow>;
  fetchAllExportRows: () => Promise<OrderExportRow[]>;
}) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const headers = [
    "orderNumber",
    "status",
    "customerName",
    "customerPhone",
    "driverName",
    "itemCount",
    "area",
    "codTotal",
    "createdAt",
  ] as const;

  async function handleExport() {
    setExporting(true);
    try {
      const selected = table.getFilteredSelectedRowModel().rows;
      let rows: OrderExportRow[];

      if (selected.length > 0) {
        rows = selected.map((r) => ({
          orderNumber: r.original.orderNumber,
          status: r.original.status,
          customerName: r.original.customer?.name ?? "",
          customerPhone: r.original.customer?.phone ?? "",
          driverName: r.original.driver?.name ?? "",
          itemCount: r.original.items.length,
          city: r.original.city ?? "",
          area: r.original.area ?? "",
          street: r.original.street ?? "",
          deliveryFee: "",
          codTotal: r.original.codTotal ?? "",
          createdAt:
            r.original.createdAt instanceof Date
              ? r.original.createdAt.toISOString()
              : String(r.original.createdAt),
          deliveredAt: "",
        }));
      } else {
        rows = await fetchAllExportRows();
      }

      const csv = rowsToCsv(
        [...headers],
        rows.map((r) => ({
          orderNumber: r.orderNumber,
          status: r.status,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          driverName: r.driverName,
          itemCount: r.itemCount,
          area: r.area,
          codTotal: r.codTotal,
          createdAt: r.createdAt,
        })),
      );
      downloadCsv("orders.csv", csv);
      toast.success(String(t("dataTable.exportSuccess", { count: rows.length })));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : String(t("dataTable.exportFailed")),
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            type="button"
            className="size-8"
            onClick={() => void handleExport()}
            disabled={exporting}
            aria-label={String(t("dataTable.export.export"))}
          >
            <DownloadIcon className="size-3.5" />
          </Button>
        }
      />
      <TooltipContent>{String(t("dataTable.export.export"))}</TooltipContent>
    </Tooltip>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export function OrdersTable() {
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
  const [rowAction, setRowAction] = useState<OrderRowAction>(null);
  const [cancelReason, setCancelReason] = useState("");
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

  const { data, isFetching } = useQuery({
    ...trpc.admin.orders.list.queryOptions(listInput),
    refetchInterval: 10_000,
  });

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
    () => buildOrderColumns({ locale, t, setRowAction }),
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
        queryKey: trpc.admin.orders.list.queryKey(),
      }),
    [queryClient, trpc],
  );

  const assign = useMutation(
    trpc.admin.orders.assign.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setRowAction(null);
      },
    }),
  );

  const cancel = useMutation(
    trpc.admin.orders.cancel.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setRowAction(null);
        setCancelReason("");
      },
    }),
  );

  const { data: assignableDrivers } = useQuery({
    ...trpc.admin.orders.assignableDrivers.queryOptions(),
    enabled: rowAction?.variant === "assign",
  });

  const fetchAllExportRows = useCallback(async (): Promise<OrderExportRow[]> => {
    const result = await queryClient.fetchQuery(
      trpc.admin.orders.exportRows.queryOptions({
        sorting,
        columnFilters: serializeColumnFiltersForServer(columnFilters),
        globalFilter: globalFilter || undefined,
      }),
    );
    return result.rows;
  }, [columnFilters, globalFilter, queryClient, sorting, trpc]);

  const statusOptions = ORDER_STATUSES.map((s) => ({
    value: s,
    label: String(t(`shop.status.${s}`)),
  }));

  const statusColumn = table.getColumn("status");
  const areaColumn = table.getColumn("area");
  const codTotalColumn = table.getColumn("codTotal");
  const createdAtColumn = table.getColumn("createdAt");

  return (
    <>
      <div
        className={
          isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"
        }
      >
        <EntityPageHeader title={String(t("admin.orders.title"))} />

        <DataTable
          table={table}
          toolbar={
            <DataTableToolbar
              table={table}
              globalFilter={resolvedGlobalFilter}
              onGlobalFilterChange={(value) => setResolvedGlobalFilter(value)}
              searchPlaceholder={String(t("dataTable.searchOrdersHint"))}
              filterSlot={
                <>
                  {statusColumn ? (
                    <DataTableFacetedFilter
                      column={statusColumn}
                      title={String(t("admin.items.status"))}
                      options={statusOptions}
                    />
                  ) : null}
                  {createdAtColumn ? (
                    <DataTableDateRangeFilter
                      column={createdAtColumn}
                      title={String(t("admin.orders.created"))}
                    />
                  ) : null}
                  {codTotalColumn ? (
                    <DataTableNumberRangeFilter
                      column={codTotalColumn}
                      title={String(t("admin.orders.codTotal"))}
                    />
                  ) : null}
                  {areaColumn ? (
                    <DataTableTextFilter
                      column={areaColumn}
                      title={String(t("address.area"))}
                    />
                  ) : null}
                </>
              }
            >
              <DataTableViewOptions table={table} />
              <OrdersExportButton
                table={table}
                fetchAllExportRows={fetchAllExportRows}
              />
            </DataTableToolbar>
          }
          footer={<DataTablePagination table={table} />}
          actionBar={
            <DataTableActionBar table={table}>
              <OrdersBulkActions table={table} />
            </DataTableActionBar>
          }
        />
      </div>

      {/* Assign dialog */}
      <Dialog
        open={rowAction?.variant === "assign"}
        onOpenChange={(open) => {
          if (!open) setRowAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{String(t("admin.orders.assignTitle"))}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {assignableDrivers?.length === 0 ? (
              <p className="text-destructive text-sm">
                {String(t("admin.orders.noDrivers"))}
              </p>
            ) : null}
            {(assignableDrivers ?? []).map((driver) => (
              <Card
                key={driver.id}
                className="flex-row items-center justify-between gap-3 rounded-md p-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{driver.user.name}</span>
                  <span className="text-muted-foreground text-xs" dir="ltr">
                    {driver.user.phone}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {String(
                      t("admin.orders.activeOrdersShort", {
                        count: String(driver.activeOrders),
                      }),
                    )}
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={assign.isPending}
                  onClick={() => {
                    if (rowAction?.variant === "assign") {
                      assign.mutate({
                        orderId: rowAction.row.id,
                        driverId: driver.userId,
                      });
                    }
                  }}
                >
                  {String(t("admin.orders.assign"))}
                </Button>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog
        open={rowAction?.variant === "cancel"}
        onOpenChange={(open) => {
          if (!open) {
            setRowAction(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{String(t("admin.orders.cancelTitle"))}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {String(t("admin.orders.cancelReason"))}
            </label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRowAction(null);
                setCancelReason("");
              }}
            >
              {String(t("common.cancel"))}
            </Button>
            <Button
              variant="destructive"
              disabled={cancelReason.trim().length < 2 || cancel.isPending}
              onClick={() => {
                if (rowAction?.variant === "cancel") {
                  cancel.mutate({
                    orderId: rowAction.row.id,
                    reason: cancelReason.trim(),
                  });
                }
              }}
            >
              {String(t("common.confirm"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function OrdersBulkActions({ table }: { table: Table<OrderRow> }) {
  const { t } = useTranslation();

  function exportSelected() {
    const rows = table.getFilteredSelectedRowModel().rows;
    if (!rows.length) return;
    const headers = [
      "orderNumber",
      "status",
      "customerName",
      "customerPhone",
      "driverName",
      "itemCount",
      "area",
      "codTotal",
      "createdAt",
    ] as const;
    const csv = rowsToCsv(
      [...headers],
      rows.map((r) => ({
        orderNumber: r.original.orderNumber,
        status: r.original.status,
        customerName: r.original.customer?.name ?? "",
        customerPhone: r.original.customer?.phone ?? "",
        driverName: r.original.driver?.name ?? "",
        itemCount: r.original.items.length,
        area: r.original.area ?? "",
        codTotal: r.original.codTotal ?? "",
        createdAt:
          r.original.createdAt instanceof Date
            ? r.original.createdAt.toISOString()
            : String(r.original.createdAt),
      })),
    );
    downloadCsv("orders-selected.csv", csv);
    table.resetRowSelection();
  }

  return (
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
  );
}
