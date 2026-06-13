"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { MoreHorizontalIcon, UploadIcon } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

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
import { ImportReviewDialog } from "@/features/core/import-review";
import type {
  ImportReviewColumn,
  ImportReviewRow,
  ParsedImportFile,
} from "@/features/core/import-review";
import { ImageUpload } from "@/features/admin/image-upload";
import { useTRPC } from "@/lib/trpc/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategoryRow = {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  imageUrl: string | null | undefined;
  sortOrder: number;
  isActive: boolean;
};

type CategoryFormState = {
  id?: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

type CategoryImportRow = ImportReviewRow & {
  nameEn: string;
  nameAr: string;
  slug: string;
  sortOrder: number;
};

const emptyForm: Omit<CategoryFormState, "id"> = {
  nameEn: "",
  nameAr: "",
  slug: "",
  imageUrl: null,
  sortOrder: 0,
  isActive: true,
};

// ---------------------------------------------------------------------------
// Global filter function for client mode
// ---------------------------------------------------------------------------

const categoryGlobalFilter: FilterFn<CategoryRow> = (row, _columnId, value) => {
  if (typeof value !== "string" || !value.trim()) return true;
  const q = value.toLowerCase();
  return (
    row.original.nameEn.toLowerCase().includes(q) ||
    row.original.nameAr.toLowerCase().includes(q) ||
    row.original.slug.toLowerCase().includes(q)
  );
};

// ---------------------------------------------------------------------------
// Edit/Create Dialog
// ---------------------------------------------------------------------------

function CategoryFormDialog({
  form,
  setForm,
  onSubmit,
  isSubmitting,
}: {
  form: CategoryFormState | null;
  setForm: (f: CategoryFormState | null) => void;
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
              ? String(t("admin.categories.editTitle"))
              : String(t("admin.categories.addTitle"))}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.categories.nameAr"))}</Label>
            <Input
              dir="rtl"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.categories.nameEn"))}</Label>
            <Input
              dir="ltr"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.categories.slug"))}</Label>
            <Input
              dir="ltr"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.categories.sortOrder"))}</Label>
            <Input
              type="number"
              dir="ltr"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.common.image"))}</Label>
            <ImageUpload
              value={form.imageUrl}
              folder="categories"
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            {String(t("admin.categories.isActive"))}
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

export function CategoriesTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const listOptions = trpc.admin.catalog.categories.list.queryOptions();
  const { data: categories } = useQuery(listOptions);
  const rows: CategoryRow[] = useMemo(
    () =>
      (categories ?? []).map((c) => ({
        id: c.id,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        slug: c.slug,
        imageUrl: c.imageUrl,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      })),
    [categories],
  );

  const invalidateList = useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: listOptions.queryKey }),
    [queryClient, listOptions.queryKey],
  );

  // ---- Form state ----
  const [form, setForm] = useState<CategoryFormState | null>(null);

  const create = useMutation(
    trpc.admin.catalog.categories.create.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setForm(null);
      },
    }),
  );

  const update = useMutation(
    trpc.admin.catalog.categories.update.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setForm(null);
      },
    }),
  );

  const remove = useMutation(
    trpc.admin.catalog.categories.delete.mutationOptions({
      onSuccess: () => void invalidateList(),
    }),
  );

  const bulkSetActive = useMutation(
    trpc.admin.catalog.categories.bulkSetActive.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setRowSelection({});
      },
    }),
  );

  const bulkDelete = useMutation(
    trpc.admin.catalog.categories.bulkDelete.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setRowSelection({});
      },
    }),
  );

  const importRows = useMutation(
    trpc.admin.catalog.categories.importRows.mutationOptions(),
  );

  function handleSubmit() {
    if (!form) return;
    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      slug: form.slug,
      imageUrl: form.imageUrl,
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
  const columns = useMemo<ColumnDef<CategoryRow>[]>(() => {
    return [
      createSelectColumn<CategoryRow>(),

      {
        id: "image",
        enableSorting: false,
        enableHiding: true,
        size: 56,
        meta: { label: String(t("admin.common.image")) },
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">
            {String(t("admin.common.image"))}
          </span>
        ),
        cell: ({ row }) =>
          row.original.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.original.imageUrl}
              alt=""
              className="size-8 rounded object-cover"
            />
          ) : (
            <div className="size-8 rounded bg-muted" />
          ),
      },

      {
        id: "nameAr",
        accessorKey: "nameAr",
        enableSorting: true,
        enableHiding: true,
        meta: { label: String(t("admin.categories.nameAr")) },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={String(t("admin.categories.nameAr"))}
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
        meta: { label: String(t("admin.categories.nameEn")) },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={String(t("admin.categories.nameEn"))}
          />
        ),
        cell: ({ row }) => row.original.nameEn,
      },

      {
        id: "slug",
        accessorKey: "slug",
        enableSorting: true,
        enableHiding: true,
        meta: { label: String(t("admin.categories.slug")) },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={String(t("admin.categories.slug"))}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.slug}</span>
        ),
      },

      {
        id: "sortOrder",
        accessorKey: "sortOrder",
        enableSorting: true,
        enableHiding: true,
        meta: { label: String(t("admin.categories.sortOrder")) },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={String(t("admin.categories.sortOrder"))}
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
          label: String(t("admin.categories.isActive")),
          filterVariant: "multiSelect" as const,
          options: [
            { label: String(t("admin.common.active")), value: "true" },
            { label: String(t("admin.common.inactive")), value: "false" },
          ],
        },
        // For client-mode faceted filtering: store as string "true"/"false"
        accessorFn: (row) => String(row.isActive),
        filterFn: (row, _columnId, filterValue: string[]) => {
          if (!filterValue || filterValue.length === 0) return true;
          return filterValue.includes(String(row.original.isActive));
        },
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">
            {String(t("admin.categories.isActive"))}
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

      createEntityActionsColumn<CategoryRow>({
        t,
        cell: ({ row }) => {
          const cat = row.original;
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
                      id: cat.id,
                      nameEn: cat.nameEn,
                      nameAr: cat.nameAr,
                      slug: cat.slug,
                      imageUrl: cat.imageUrl ?? null,
                      sortOrder: cat.sortOrder,
                      isActive: cat.isActive,
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
                      remove.mutate({ id: cat.id });
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
  } = useDataTable<CategoryRow>({
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
    globalFilterFn: categoryGlobalFilter,
  });

  // ---- Import: previewFile ----
  const previewFile = useCallback(
    async (file: ParsedImportFile): Promise<{ rows: CategoryImportRow[] }> => {
      const seen = new Set<string>();
      const importedRows: CategoryImportRow[] = file.rows.map((raw, index) => {
        const nameEn = String(raw.nameEn ?? "").trim();
        const nameAr = String(raw.nameAr ?? "").trim();
        const slug = String(raw.slug ?? "").trim();
        const sortOrderRaw = Number(raw.sortOrder ?? 0);
        const sortOrder = Number.isInteger(sortOrderRaw) && sortOrderRaw >= 0 ? sortOrderRaw : -1;

        const reasons: string[] = [];

        if (!nameEn || nameEn.length < 2)
          reasons.push(String(t("dataTable.importReasonNameEnRequired")));
        if (!nameAr || nameAr.length < 2)
          reasons.push(String(t("dataTable.importReasonNameArRequired")));
        if (!slug)
          reasons.push(String(t("dataTable.importReasonSlugRequired")));
        if (sortOrder < 0)
          reasons.push(String(t("dataTable.importReasonSortOrderInvalid")));

        if (slug && seen.has(slug))
          reasons.push(String(t("dataTable.importReasonDuplicateInFile")));
        else if (slug) seen.add(slug);

        return {
          rowNumber: index + 1,
          status: reasons.length === 0 ? ("valid" as const) : ("invalid" as const),
          reasons,
          nameEn,
          nameAr,
          slug,
          sortOrder: sortOrder >= 0 ? sortOrder : 0,
        };
      });

      return { rows: importedRows };
    },
    [t],
  );

  // ---- Import: commitFile ----
  const commitFile = useCallback(
    async ({
      rowsToCommit,
      reviewRows,
    }: {
      file: ParsedImportFile;
      reviewRows: CategoryImportRow[];
      rowsToCommit: CategoryImportRow[];
    }): Promise<CategoryImportRow[]> => {
      const payload = rowsToCommit.map((r) => ({
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        slug: r.slug,
        sortOrder: r.sortOrder,
      }));

      const result = await importRows.mutateAsync({ rows: payload });

      const updatedRows = [...reviewRows];
      let commitIndex = 0;
      for (let i = 0; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        if (!row || row.status !== "valid") continue;
        const serverResult = result.results[commitIndex];
        commitIndex++;
        if (!serverResult) continue;
        updatedRows[i] = { ...row, status: "done" as const };
      }

      return updatedRows;
    },
    [importRows],
  );

  // ---- Import columns for dialog ----
  const importColumns = useMemo<ImportReviewColumn<CategoryImportRow>[]>(
    () => [
      {
        id: "status",
        header: String(t("dataTable.importStatusColumn")),
        cell: (row) => (
          <span
            className={
              row.status === "valid"
                ? "text-emerald-600"
                : row.status === "done"
                  ? "text-muted-foreground"
                  : "text-destructive"
            }
          >
            {row.status}
          </span>
        ),
      },
      {
        id: "nameAr",
        header: String(t("admin.categories.nameAr")),
        cell: (row) => row.nameAr,
      },
      {
        id: "nameEn",
        header: String(t("admin.categories.nameEn")),
        cell: (row) => row.nameEn,
      },
      {
        id: "slug",
        header: String(t("admin.categories.slug")),
        cell: (row) => row.slug,
      },
      {
        id: "sortOrder",
        header: String(t("admin.categories.sortOrder")),
        cell: (row) => row.sortOrder,
      },
      {
        id: "reasons",
        header: String(t("dataTable.importResultColumn")),
        cell: (row) =>
          row.reasons.length > 0 ? (
            <ul className="list-disc ps-4 text-destructive">
              {row.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : null,
      },
    ],
    [t],
  );

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
      ["nameEn", "nameAr", "slug", "sortOrder", "isActive"],
      selectedRows.map((row) => ({
        nameEn: row.nameEn,
        nameAr: row.nameAr,
        slug: row.slug,
        sortOrder: row.sortOrder,
        isActive: String(row.isActive),
      })),
    );
    downloadCsv("categories-selected.csv", csv);
    toast.success(
      String(t("dataTable.exportSuccess", { count: selectedRows.length })),
    );
  };

  return (
    <div className="space-y-4">
      <EntityPageHeader title={String(t("admin.categories.title"))} />

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(v) => setResolvedGlobalFilter(v)}
            searchPlaceholder={String(t("dataTable.searchCategoriesHint"))}
            filterSlot={
              <DataTableFacetedFilter
                column={table.getColumn("isActive")}
                title={String(t("admin.categories.isActive"))}
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
              exportFileName="categories.csv"
              getExportRow={(row) => ({
                nameEn: row.nameEn,
                nameAr: row.nameAr,
                slug: row.slug,
                sortOrder: row.sortOrder,
                isActive: String(row.isActive),
              })}
            />
            <ImportReviewDialog<CategoryImportRow>
              trigger={
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        className="size-8"
                        aria-label={String(t("dataTable.importCsv"))}
                      >
                        <UploadIcon className="size-3.5" />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {String(t("dataTable.importCsv"))}
                  </TooltipContent>
                </Tooltip>
              }
              columns={importColumns}
              previewFile={previewFile}
              commitFile={commitFile}
              getRowId={(row) => row.rowNumber}
              onCommitted={() => void invalidateList()}
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

      <CategoryFormDialog
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />
    </div>
  );
}
