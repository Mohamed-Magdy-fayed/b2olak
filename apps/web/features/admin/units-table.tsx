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

import { useAppForm } from "@/components/forms/hooks";
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

type UnitFormValues = Omit<UnitFormState, "id">;

const emptyForm: UnitFormValues = {
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
  onClose,
  onSubmit,
  isSubmitting,
}: {
  form: UnitFormState | null;
  onClose: () => void;
  onSubmit: (values: UnitFormValues) => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={form !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {form && (
          <UnitFormBody
            key={form.id ?? "new"}
            initial={form}
            isEdit={Boolean(form.id)}
            onClose={onClose}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UnitFormBody({
  initial,
  isEdit,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  initial: UnitFormState;
  isEdit: boolean;
  onClose: () => void;
  onSubmit: (values: UnitFormValues) => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();

  const form = useAppForm({
    defaultValues: {
      code: initial.code,
      nameEn: initial.nameEn,
      nameAr: initial.nameAr,
      sortOrder: initial.sortOrder as number | null,
      isActive: initial.isActive,
    },
    onSubmit: ({ value }) =>
      onSubmit({
        code: value.code,
        nameEn: value.nameEn,
        nameAr: value.nameAr,
        sortOrder: value.sortOrder ?? 0,
        isActive: value.isActive,
      }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {isEdit
            ? String(t("admin.units.editTitle"))
            : String(t("admin.units.addTitle"))}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <form.AppField name="code">
          {(field) => (
            <field.StringField
              label={String(t("admin.units.code"))}
              className="text-start"
            />
          )}
        </form.AppField>
        <form.AppField name="nameAr">
          {(field) => (
            <field.StringField label={String(t("admin.units.nameAr"))} />
          )}
        </form.AppField>
        <form.AppField name="nameEn">
          {(field) => (
            <field.StringField
              label={String(t("admin.units.nameEn"))}
              className="text-start"
            />
          )}
        </form.AppField>
        <form.AppField name="sortOrder">
          {(field) => (
            <field.NumberField label={String(t("admin.units.sortOrder"))} />
          )}
        </form.AppField>
        <form.AppField name="isActive">
          {(field) => (
            <field.BooleanField label={String(t("admin.units.isActive"))} />
          )}
        </form.AppField>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {String(t("common.cancel"))}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {String(t("common.save"))}
        </Button>
      </DialogFooter>
    </form>
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
        toast.success("Unit created");
      },
    }),
  );

  const update = useMutation(
    trpc.admin.units.update.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setForm(null);
        toast.success("Unit updated");
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
        toast.success("Units updated");
      },
    }),
  );

  const bulkDelete = useMutation(
    trpc.admin.units.bulkDelete.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setRowSelection({});
        toast.success("Units deleted");
      },
      onError: (err) => {
        if (err.message === "admin.units.deleteInUse") {
          toast.error(String(t("admin.units.deleteInUse")));
        }
      },
    }),
  );

  function handleSubmit(values: UnitFormValues) {
    if (form?.id) update.mutate({ id: form.id, ...values });
    else create.mutate(values);
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
        onClose={() => setForm(null)}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />
    </div>
  );
}
