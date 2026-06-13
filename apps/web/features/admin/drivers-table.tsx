"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnPinningState,
  RowSelectionState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { DownloadIcon, PlusIcon, UserCheckIcon, UserXIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
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
import { buildDriverColumns, type DriverRow } from "./drivers-columns";

type RouterOutput = inferRouterOutputs<AppRouter>;
type DriverExportRow =
  RouterOutput["admin"]["drivers"]["exportRows"]["rows"][number];

export type DriverRowAction = {
  row: DriverRow;
  variant: "approve" | "suspend" | "reactivate";
} | null;

const VEHICLES = ["motorcycle", "bicycle", "car", "on_foot"] as const;
type Vehicle = (typeof VEHICLES)[number];

type VehicleKey =
  | "vehicleMotorcycle"
  | "vehicleBicycle"
  | "vehicleCar"
  | "vehicleOnFoot";

const vehicleKeyMap: Record<Vehicle, VehicleKey> = {
  motorcycle: "vehicleMotorcycle",
  bicycle: "vehicleBicycle",
  car: "vehicleCar",
  on_foot: "vehicleOnFoot",
};

// ─── Standalone export button ─────────────────────────────────────────────────

function DriversExportButton({
  table,
  fetchAllExportRows,
}: {
  table: Table<DriverRow>;
  fetchAllExportRows: () => Promise<DriverExportRow[]>;
}) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const headers = [
    "name",
    "phone",
    "status",
    "vehicleType",
    "vehiclePlate",
    "isAvailable",
    "activeOrders",
    "deliveredOrders",
    "createdAt",
  ] as const;

  async function handleExport() {
    setExporting(true);
    try {
      const selected = table.getFilteredSelectedRowModel().rows;
      let rows: DriverExportRow[];

      if (selected.length > 0) {
        rows = selected.map((r) => ({
          name: r.original.user?.name ?? "",
          phone: r.original.user?.phone ?? "",
          status: r.original.status,
          vehicleType: r.original.vehicleType,
          vehiclePlate: r.original.vehiclePlate ?? "",
          isAvailable: r.original.isAvailable,
          activeOrders: r.original.activeOrders,
          deliveredOrders: r.original.deliveredOrders,
          createdAt:
            r.original.createdAt instanceof Date
              ? r.original.createdAt.toISOString()
              : String(r.original.createdAt),
        }));
      } else {
        rows = await fetchAllExportRows();
      }

      const csv = rowsToCsv(
        [...headers],
        rows.map((r) => ({ ...r })),
      );
      downloadCsv("drivers.csv", csv);
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

export function DriversTable() {
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
  const [rowAction, setRowAction] = useState<DriverRowAction>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() =>
    getEntityColumnPinning(),
  );

  // Add-driver dialog state
  const [adding, setAdding] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverVehicle, setDriverVehicle] = useState<Vehicle>("motorcycle");
  const [driverPlate, setDriverPlate] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

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
    trpc.admin.drivers.list.queryOptions(listInput),
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
    () => buildDriverColumns({ locale, t, setRowAction }),
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
        queryKey: trpc.admin.drivers.list.queryKey(),
      }),
    [queryClient, trpc],
  );

  const setStatus = useMutation(
    trpc.admin.drivers.setStatus.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setRowAction(null);
      },
    }),
  );

  const bulkSetStatus = useMutation(
    trpc.admin.drivers.bulkSetStatus.mutationOptions({
      onSuccess: () => {
        void invalidate();
        table.resetRowSelection();
      },
    }),
  );

  const create = useMutation(
    trpc.admin.drivers.create.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setAdding(false);
        setDriverName("");
        setDriverPhone("");
        setDriverPlate("");
        setAddError(null);
      },
      onError: (err) => {
        setAddError(
          err.message === "admin.drivers.alreadyDriver"
            ? String(t("admin.drivers.alreadyDriver"))
            : err.message === "admin.drivers.phoneIsAdmin"
              ? String(t("admin.drivers.phoneIsAdmin"))
              : String(t("validation.phoneInvalid")),
        );
      },
    }),
  );

  // Handle single-row actions imperatively via useEffect
  useEffect(() => {
    if (!rowAction) return;
    if (rowAction.variant === "approve" || rowAction.variant === "reactivate") {
      setStatus.mutate({ profileId: rowAction.row.id, status: "approved" });
    } else if (rowAction.variant === "suspend") {
      if (
        rowAction.row.activeOrders === 0 ||
        window.confirm(String(t("admin.drivers.suspendWarning")))
      ) {
        setStatus.mutate({ profileId: rowAction.row.id, status: "suspended" });
      } else {
        setRowAction(null);
      }
    }
    // Only trigger when rowAction changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowAction]);

  const fetchAllExportRows = useCallback(async (): Promise<DriverExportRow[]> => {
    const result = await queryClient.fetchQuery(
      trpc.admin.drivers.exportRows.queryOptions({
        sorting,
        columnFilters: serializeColumnFiltersForServer(columnFilters),
        globalFilter: globalFilter || undefined,
      }),
    );
    return result.rows;
  }, [columnFilters, globalFilter, queryClient, sorting, trpc]);

  const driverStatusOptions = [
    { value: "pending", label: String(t("admin.drivers.statusPending")) },
    { value: "approved", label: String(t("admin.drivers.statusApproved")) },
    { value: "suspended", label: String(t("admin.drivers.statusSuspended")) },
  ];

  const vehicleTypeOptions = VEHICLES.map((v) => ({
    value: v,
    label: String(t(`admin.drivers.${vehicleKeyMap[v]}`)),
  }));

  const availabilityOptions = [
    { value: "true", label: String(t("admin.drivers.available")) },
    { value: "false", label: String(t("admin.drivers.offline")) },
  ];

  const statusColumn = table.getColumn("status");
  const vehicleTypeColumn = table.getColumn("vehicleType");
  const isAvailableColumn = table.getColumn("isAvailable");
  const createdAtColumn = table.getColumn("createdAt");

  return (
    <>
      <div
        className={
          isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"
        }
      >
        <EntityPageHeader title={String(t("admin.drivers.title"))} />

        <DataTable
          table={table}
          toolbar={
            <DataTableToolbar
              table={table}
              globalFilter={resolvedGlobalFilter}
              onGlobalFilterChange={(value) => setResolvedGlobalFilter(value)}
              searchPlaceholder={String(t("dataTable.searchDriversHint"))}
              filterSlot={
                <>
                  {statusColumn ? (
                    <DataTableFacetedFilter
                      column={statusColumn}
                      title={String(t("admin.items.status"))}
                      options={driverStatusOptions}
                    />
                  ) : null}
                  {vehicleTypeColumn ? (
                    <DataTableFacetedFilter
                      column={vehicleTypeColumn}
                      title={String(t("admin.drivers.vehicle"))}
                      options={vehicleTypeOptions}
                    />
                  ) : null}
                  {isAvailableColumn ? (
                    <DataTableFacetedFilter
                      column={isAvailableColumn}
                      title={String(t("admin.drivers.available"))}
                      options={availabilityOptions}
                    />
                  ) : null}
                  {createdAtColumn ? (
                    <DataTableDateRangeFilter
                      column={createdAtColumn}
                      title={String(t("admin.users.created"))}
                    />
                  ) : null}
                </>
              }
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => setAdding(true)}
                    >
                      <PlusIcon className="size-3.5" />
                      <span className="hidden sm:inline">
                        {String(t("admin.common.add"))}
                      </span>
                    </Button>
                  }
                />
                <TooltipContent>
                  {String(t("admin.drivers.addTitle"))}
                </TooltipContent>
              </Tooltip>
              <DataTableViewOptions table={table} />
              <DriversExportButton
                table={table}
                fetchAllExportRows={fetchAllExportRows}
              />
            </DataTableToolbar>
          }
          footer={<DataTablePagination table={table} />}
          actionBar={
            <DataTableActionBar table={table}>
              <DriversBulkActions
                table={table}
                onBulkApprove={(ids) =>
                  bulkSetStatus.mutate({ profileIds: ids, status: "approved" })
                }
                onBulkSuspend={(ids) => {
                  if (
                    window.confirm(String(t("admin.drivers.suspendWarning")))
                  ) {
                    bulkSetStatus.mutate({
                      profileIds: ids,
                      status: "suspended",
                    });
                  }
                }}
                isPending={bulkSetStatus.isPending}
              />
            </DataTableActionBar>
          }
        />
      </div>

      {/* Add driver dialog */}
      <Dialog
        open={adding}
        onOpenChange={(open) => {
          if (!open) {
            setAdding(false);
            setAddError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{String(t("admin.drivers.addTitle"))}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>{String(t("admin.drivers.name"))}</Label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{String(t("admin.drivers.phone"))}</Label>
              <PhoneInput
                id="driver-phone"
                value={driverPhone}
                onChange={(v) => {
                  setAddError(null);
                  setDriverPhone(v);
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{String(t("admin.drivers.vehicle"))}</Label>
              <Select
                value={driverVehicle}
                onValueChange={(v) => {
                  if (v) setDriverVehicle(v as Vehicle);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {String(t(`admin.drivers.${vehicleKeyMap[v]}`))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{String(t("admin.drivers.plate"))}</Label>
              <Input
                value={driverPlate}
                onChange={(e) => setDriverPlate(e.target.value)}
              />
            </div>
            {addError ? (
              <p className="text-destructive text-sm">{addError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdding(false);
                setAddError(null);
              }}
            >
              {String(t("common.cancel"))}
            </Button>
            <Button
              disabled={
                driverName.trim().length < 2 ||
                driverPhone.trim().length < 10 ||
                create.isPending
              }
              onClick={() =>
                create.mutate({
                  name: driverName.trim(),
                  phone: driverPhone.trim(),
                  vehicleType: driverVehicle,
                  vehiclePlate: driverPlate.trim() || undefined,
                })
              }
            >
              {String(t("common.save"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function DriversBulkActions({
  table,
  onBulkApprove,
  onBulkSuspend,
  isPending,
}: {
  table: Table<DriverRow>;
  onBulkApprove: (ids: string[]) => void;
  onBulkSuspend: (ids: string[]) => void;
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
      "status",
      "vehicleType",
      "vehiclePlate",
      "isAvailable",
      "activeOrders",
      "deliveredOrders",
      "createdAt",
    ] as const;
    const csv = rowsToCsv(
      [...headers],
      rows.map((r) => ({
        name: r.original.user?.name ?? "",
        phone: r.original.user?.phone ?? "",
        status: r.original.status,
        vehicleType: r.original.vehicleType,
        vehiclePlate: r.original.vehiclePlate ?? "",
        isAvailable: r.original.isAvailable,
        activeOrders: r.original.activeOrders,
        deliveredOrders: r.original.deliveredOrders,
        createdAt:
          r.original.createdAt instanceof Date
            ? r.original.createdAt.toISOString()
            : String(r.original.createdAt),
      })),
    );
    downloadCsv("drivers-selected.csv", csv);
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
              onClick={() => onBulkApprove(getSelectedIds())}
              aria-label={String(t("admin.drivers.approve"))}
            >
              <UserCheckIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("admin.drivers.approve"))}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isPending}
              onClick={() => onBulkSuspend(getSelectedIds())}
              aria-label={String(t("admin.drivers.suspend"))}
            >
              <UserXIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("admin.drivers.suspend"))}</TooltipContent>
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
