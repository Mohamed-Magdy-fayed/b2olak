"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { FilterFn } from "@tanstack/react-table";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  DataTable,
  DataTableActionBar,
  DataTableColumnHeader,
  DataTableExportButton,
  DataTableFacetedFilter,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  EntityPageHeader,
  createEntityActionsColumn,
  createSelectColumn,
  downloadCsv,
  rowsToCsv,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
import { useTRPC } from "@/lib/trpc/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UnitRow = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
  isActive: boolean;
};

type UnitFormState = {
  id?: string;
  code: string;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: Omit<UnitFormState, "id"> = {
  code: "",
  nameEn: "",
  nameAr: "",
  sortOrder: 0,
  isActive: true,
};

// ---------------------------------------------------------------------------
// Global filter function for client mode
// ---------------------------------------------------------------------------

const unitGlobalFilter: FilterFn<UnitRow> = (row, _columnId, value) => {
  if (typeof value !== "string" || !value.trim()) return true;
  const q = value.toLowerCase();
  return (
    row.original.code.toLowerCase().includes(q) ||
    row.original.nameEn.toLowerCase().includes(q) ||
    row.original.nameAr.toLowerCase().includes(q)
  );
};

// ---------------------------------------------------------------------------
// Edit/Create Dialog
// ---------------------------------------------------------------------------

function UnitFormDialog({
  form,
  setForm,
  onSubmit,
  isSubmitting,
}: {
  form: UnitFormState | null;
  setForm: (f: UnitFormState | null) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();
  if (!form) return null;

  return (
    <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {form.id
              ? String(t("admin.units.editTitle"))
              : String(t("admin.units.addTitle"))}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.units.code"))}</Label>
            <Input
              dir="ltr"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.units.nameAr"))}</Label>
            <Input
              dir="rtl"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.units.nameEn"))}</Label>
            <Input
              dir="ltr"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.units.sortOrder"))}</Label>
            <Input
              type="number"
              dir="ltr"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            {String(t("admin.units.isActive"))}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setForm(null)}>
            {String(t("common.cancel"))}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {String(t("common.save"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

export function UnitsTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const listOptions = trpc.admin.units.list.queryOptions();
  const { data: units } = useQuery(listOptions);
  const rows: UnitRow[] = useMemo(
    () =>
      (units ?? []).map((u) => ({
        id: u.id,
        code: u.code,
        nameEn: u.nameEn,
        nameAr: u.nameAr,
        sortOrder: u.sortOrder,
        isActive: u.isActive,
      })),
    [units],
  );

  const invalidateList = useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: listOptions.queryKey }),
    [queryClient, listOptions.queryKey],
  );

  // ---- Form state ----
  const [form, setForm] = useState<UnitFormState | null>(null);

  const create = useMutation(
    trpc.admin.units.create.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setForm(null);
      },
    }),
  );

  const update = useMutation(
    trpc.admin.units.update.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setForm(null);
      },
    }),
  );

  const remove = useMutation(
    trpc.admin.units.delete.mutationOptions({
      onSuccess: () => void invalidateList(),
      onError: (err) => {
        if (err.message === "admin.units.deleteInUse") {
          toast.error(String(t("admin.units.deleteInUse")));
        }
      },
    }),
  );

  const bulkSetActive = useMutation(
    trpc.admin.units.bulkSetActive.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setRowSelection({});
      },
    }),
  );

  const bulkDelete = useMutation(
    trpc.admin.units.bulkDelete.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setRowSelection({});
      },
      onError: (err) => {
        if (err.message === "admin.units.deleteInUse") {
          toast.error(String(t("admin.units.deleteInUse")));
        }
      },
    }),
  );

  function handleSubmit() {
    if (!form) return;
    const payload = {
      code: form.code,
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    if (form.id) update.mutate({ id: form.id, ...payload });
    else create.mutate(payload);
  }

  // ---- URL state ----
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

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnPinning, setColumnPinning] = useState<import("@tanstack/react-table").ColumnPinningState>(() => ({
    left: ["select"],
    right: ["actions"],
  }));

  // ---- Columns ----
  const columns = useMemo<ColumnDef<UnitRow>[]>(() => {
    return [
      createSelectColumn<UnitRow>(),

      {
        id: "code",
        accessorKey: "code",
        enableSorting: true,
        enableHiding: true,
        meta: { label: String(t("admin.units.code")) },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={String(t("admin.units.code"))}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },

      {
        id: "nameAr",
        accessorKey: "nameAr",
        enableSorting: true,
        enableHiding: true,
        meta: { label: String(t("admin.units.nameAr")) },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={String(t("admin.units.nameAr"))}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.nameAr}</span>
        ),
      },

      {
        id: "nameEn",
        accessorKey: "nameEn",
        enableSorting: true,
        enableHiding: true,
        meta: { label: String(t("admin.units.nameEn")) },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={String(t("admin.units.nameEn"))}
          />
        ),
        cell: ({ row }) => row.original.nameEn,
      },

      {
        id: "sortOrder",
        accessorKey: "sortOrder",
        enableSorting: true,
        enableHiding: true,
        meta: { label: String(t("admin.units.sortOrder")) },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={String(t("admin.units.sortOrder"))}
          />
        ),
        cell: ({ row }) => row.original.sortOrder,
      },

      {
        id: "isActive",
        accessorKey: "isActive",
        enableSorting: false,
        enableHiding: true,
        meta: {
          label: String(t("admin.units.isActive")),
          filterVariant: "multiSelect" as const,
          options: [
            { label: String(t("admin.common.active")), value: "true" },
            { label: String(t("admin.common.inactive")), value: "false" },
          ],
        },
        accessorFn: (row) => String(row.isActive),
        filterFn: (row, _columnId, filterValue: string[]) => {
          if (!filterValue || filterValue.length === 0) return true;
          return filterValue.includes(String(row.original.isActive));
        },
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">
            {String(t("admin.units.isActive"))}
          </span>
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "secondary"}>
            {row.original.isActive
              ? String(t("admin.common.active"))
              : String(t("admin.common.inactive"))}
          </Badge>
        ),
      },

      createEntityActionsColumn<UnitRow>({
        t,
        cell: ({ row }) => {
          const unit = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontalIcon className="size-4" />
                    <span className="sr-only">
                      {String(t("admin.common.actions"))}
                    </span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    setForm({
                      id: unit.id,
                      code: unit.code,
                      nameEn: unit.nameEn,
                      nameAr: unit.nameAr,
                      sortOrder: unit.sortOrder,
                      isActive: unit.isActive,
                    })
                  }
                >
                  {String(t("admin.common.edit"))}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (
                      window.confirm(String(t("admin.common.confirmDelete")))
                    ) {
                      remove.mutate({ id: unit.id });
                    }
                  }}
                >
                  {String(t("admin.common.delete"))}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ];
  }, [t, remove]);

  // ---- Table instance ----
  const {
    table,
    globalFilter: resolvedGlobalFilter,
    setGlobalFilter: setResolvedGlobalFilter,
  } = useDataTable<UnitRow>({
    mode: "client",
    data: rows,
    columns,
    getRowId: (row) => row.id,
    controlled: {
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
    },
    globalFilterFn: unitGlobalFilter,
  });

  // ---- Bulk action helpers ----
  const selectedIds = useMemo(
    () =>
      table
        .getFilteredSelectedRowModel()
        .rows.map((r) => r.original.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowSelection, table],
  );

  const handleBulkActivate = (isActive: boolean) => {
    if (selectedIds.length === 0) return;
    bulkSetActive.mutate({ ids: selectedIds, isActive });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(String(t("admin.common.confirmDelete")))) return;
    bulkDelete.mutate({ ids: selectedIds });
  };

  const handleExportSelected = () => {
    const selectedRows = table
      .getFilteredSelectedRowModel()
      .rows.map((r) => r.original);
    if (selectedRows.length === 0) return;
    const csv = rowsToCsv(
      ["code", "nameEn", "nameAr", "sortOrder", "isActive"],
      selectedRows.map((row) => ({
        code: row.code,
        nameEn: row.nameEn,
        nameAr: row.nameAr,
        sortOrder: row.sortOrder,
        isActive: String(row.isActive),
      })),
    );
    downloadCsv("units-selected.csv", csv);
    toast.success(
      String(t("dataTable.exportSuccess", { count: selectedRows.length })),
    );
  };

  return (
    <div className="space-y-4">
      <EntityPageHeader title={String(t("admin.units.title"))} />

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(v) => setResolvedGlobalFilter(v)}
            searchPlaceholder={String(t("admin.units.title"))}
            filterSlot={
              <DataTableFacetedFilter
                column={table.getColumn("isActive")}
                title={String(t("admin.units.isActive"))}
                options={[
                  { label: String(t("admin.common.active")), value: "true" },
                  {
                    label: String(t("admin.common.inactive")),
                    value: "false",
                  },
                ]}
              />
            }
          >
            <DataTableViewOptions table={table} />
            <DataTableExportButton
              table={table}
              exportFileName="units.csv"
              getExportRow={(row) => ({
                code: row.code,
                nameEn: row.nameEn,
                nameAr: row.nameAr,
                sortOrder: row.sortOrder,
                isActive: String(row.isActive),
              })}
            />
            <Button
              size="sm"
              type="button"
              onClick={() => setForm({ ...emptyForm })}
            >
              {String(t("admin.common.add"))}
            </Button>
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleBulkActivate(true)}
              disabled={bulkSetActive.isPending}
            >
              {String(t("admin.common.active"))}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleBulkActivate(false)}
              disabled={bulkSetActive.isPending}
            >
              {String(t("admin.common.inactive"))}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleExportSelected}
            >
              {String(t("dataTable.export.export"))}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
            >
              {String(t("admin.common.delete"))}
            </Button>
          </DataTableActionBar>
        }
      />

      <UnitFormDialog
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />
    </div>
  );
}
