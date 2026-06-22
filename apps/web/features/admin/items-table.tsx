"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ColumnPinningState,
  RowSelectionState,
  VisibilityState,
} from "@tanstack/react-table";
import { CheckIcon, DownloadIcon, TrashIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import {
  DataTable,
  DataTableActionBar,
  type DataTableControlledState,
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  EntityPageHeader,
  downloadCsv,
  getEntityColumnPinning,
  rowsToCsv,
  serializeColumnFiltersForServer,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
import { ImportReviewDialog } from "@/features/core/import-review";
import type {
  ImportReviewColumn,
  ImportReviewRow,
  ParsedImportFile,
} from "@/features/core/import-review";
import { useTRPC } from "@/lib/trpc/client";

import {
  buildItemColumns,
  ItemFormBody,
  type ItemFormState,
  type ItemFormValues,
  type ItemRow,
  type UnitOption,
} from "./items-columns";

// ---------------------------------------------------------------------------
// Import review row type
// ---------------------------------------------------------------------------

type ItemImportRow = ImportReviewRow & {
  nameEn: string;
  nameAr: string;
  categorySlug: string;
  /** Default unit code. */
  unit: string;
  /** Optional pipe-separated list of all linked unit codes. */
  units: string;
};

// ---------------------------------------------------------------------------
// Add-item dialog (create form)
// ---------------------------------------------------------------------------

function AddItemDialog({
  categories,
  units,
  locale,
  onCreated,
}: {
  categories: { id: string; nameEn: string; nameAr: string }[];
  units: UnitOption[];
  locale: string;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const emptyForm = (): ItemFormValues => ({
    categoryId: categories[0]?.id ?? "",
    nameEn: "",
    nameAr: "",
    unitIds: units[0] ? [units[0].id] : [],
    defaultUnitId: units[0]?.id ?? "",
    imageUrl: null,
  });

  const create = useMutation(
    trpc.admin.catalog.items.create.mutationOptions({
      onSuccess: () => {
        onCreated();
        setOpen(false);
      },
    }),
  );

  return (
    <>
      <Button size="sm" type="button" onClick={() => setOpen(true)}>
        {String(t("admin.common.add"))}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          {open && (
            <ItemFormBody
              title={String(t("admin.items.addTitle"))}
              initial={emptyForm()}
              categories={categories}
              units={units}
              locale={locale}
              onClose={() => setOpen(false)}
              onSubmit={(values) => create.mutate(values)}
              isSubmitting={create.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main table page component
// ---------------------------------------------------------------------------

export function ItemsTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();

  // ---- URL state (pagination, sorting, filters, globalFilter) ----
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

  // ---- Local table state ----
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() =>
    getEntityColumnPinning(),
  );

  // ---- Edit form state ----
  const [editForm, setEditForm] = useState<ItemFormState | null>(null);

  // ---- Categories list (for filter options + edit dialog) ----
  const { data: categoriesData } = useQuery(
    trpc.admin.catalog.categories.list.queryOptions(),
  );
  const categories = categoriesData ?? [];

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        label: locale === "ar" ? c.nameAr : c.nameEn,
        value: c.id,
      })),
    [categories, locale],
  );

  // ---- Units list (for filter options + edit/add dialog) ----
  const { data: unitsData } = useQuery(trpc.admin.units.list.queryOptions());
  const units: UnitOption[] = useMemo(
    () => (unitsData ?? []).map((u) => ({
      id: u.id,
      code: u.code,
      nameEn: u.nameEn,
      nameAr: u.nameAr,
    })),
    [unitsData],
  );

  const unitOptions = useMemo(
    () =>
      units.map((u) => ({
        label: locale === "ar" ? u.nameAr : u.nameEn,
        value: u.id,
      })),
    [units, locale],
  );

  const unitCodes = useMemo(
    () => new Set((unitsData ?? []).map((u) => u.code)),
    [unitsData],
  );

  // ---- List query ----
  const listInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
      sorting,
      columnFilters: serializeColumnFiltersForServer(columnFilters),
      globalFilter: globalFilter || undefined,
    }),
    [
      columnFilters,
      globalFilter,
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
    ],
  );

  const { data, isFetching } = useQuery(
    trpc.admin.catalog.items.list.queryOptions(listInput),
  );

  const invalidateList = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: trpc.admin.catalog.items.list.queryKey(),
      }),
    [queryClient, trpc],
  );

  // ---- Mutations ----
  const update = useMutation(
    trpc.admin.catalog.items.update.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setEditForm(null);
      },
    }),
  );

  const remove = useMutation(
    trpc.admin.catalog.items.delete.mutationOptions({
      onSuccess: () => void invalidateList(),
    }),
  );

  const bulkApprove = useMutation(
    trpc.admin.catalog.items.bulkApprove.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setRowSelection({});
      },
    }),
  );

  const bulkDelete = useMutation(
    trpc.admin.catalog.items.bulkDelete.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setRowSelection({});
      },
    }),
  );

  const importRows = useMutation(
    trpc.admin.catalog.items.importRows.mutationOptions(),
  );

  // ---- Columns ----
  const columns = useMemo(
    () =>
      buildItemColumns({
        t,
        locale,
        categoryOptions,
        categories,
        units,
        unitOptions,
        editForm,
        setEditForm,
        onFormSubmit: (values: ItemFormValues) => {
          if (!editForm?.id || values.unitIds.length === 0) return;
          update.mutate({ id: editForm.id, ...values });
        },
        isSubmitting: update.isPending,
        onDelete: (id) => remove.mutate({ id }),
      }),
    [
      t,
      locale,
      categoryOptions,
      categories,
      units,
      unitOptions,
      editForm,
      update,
      remove,
    ],
  );

  // ---- Controlled state ----
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

  // ---- Table instance ----
  const {
    table,
    globalFilter: resolvedGlobalFilter,
    setGlobalFilter: setResolvedGlobalFilter,
  } = useDataTable({
    mode: "server",
    data: (data?.rows ?? []) as ItemRow[],
    pageCount: data?.pageCount ?? 1,
    rowCount: data?.total ?? 0,
    columns,
    getRowId: (row) => row.id,
    controlled,
  });

  // ---- Export (server-fetch all matching rows) ----
  // NOTE: exportRows returns a flat shape different from ItemRow; we implement
  // a custom handler that avoids the fetchAllRows type mismatch.
  const [isExporting, setIsExporting] = useState(false);

  const handleServerExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const selected = table.getFilteredSelectedRowModel().rows;
      if (selected.length > 0) {
        // Export only the selected rows using in-memory data
        const csv = rowsToCsv(
          ["nameEn", "nameAr", "categorySlug", "unit", "units", "status", "source", "createdAt"],
          selected.map((r) => {
            const links = [...r.original.itemUnits].sort(
              (a, b) => a.sortOrder - b.sortOrder,
            );
            return {
              nameEn: r.original.nameEn ?? "",
              nameAr: r.original.nameAr ?? "",
              categorySlug: r.original.category.nameEn,
              unit: links.find((l) => l.isDefault)?.unit.code ?? links[0]?.unit.code ?? "",
              units: links.map((l) => l.unit.code).join("|"),
              status: r.original.status,
              source: r.original.source,
              createdAt: new Date(r.original.createdAt).toISOString(),
            };
          }),
        );
        downloadCsv("items.csv", csv);
        toast.success(String(t("dataTable.exportSuccess", { count: selected.length })));
      } else {
        const result = await queryClient.fetchQuery(
          trpc.admin.catalog.items.exportRows.queryOptions({
            sorting,
            columnFilters: serializeColumnFiltersForServer(columnFilters),
            globalFilter: globalFilter || undefined,
          }),
        );
        const csv = rowsToCsv(
          ["nameEn", "nameAr", "categorySlug", "unit", "units", "status", "source", "createdAt"],
          result.rows.map((r) => ({
            nameEn: r.nameEn ?? "",
            nameAr: r.nameAr ?? "",
            categorySlug: r.categorySlug,
            unit: r.unit,
            units: r.units,
            status: r.status,
            source: r.source,
            createdAt: r.createdAt,
          })),
        );
        downloadCsv("items.csv", csv);
        toast.success(String(t("dataTable.exportSuccess", { count: result.rows.length })));
      }
    } catch {
      toast.error(String(t("dataTable.exportFailed")));
    } finally {
      setIsExporting(false);
    }
  }, [columnFilters, globalFilter, queryClient, sorting, t, table, trpc]);

  // ---- Import: previewFile ----
  const categoryBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.slug ?? "", c.id);
    }
    return map;
  }, [categories]);

  const previewFile = useCallback(
    async (file: ParsedImportFile): Promise<{ rows: ItemImportRow[] }> => {
      const seen = new Set<string>();
      const rows: ItemImportRow[] = file.rows.map((raw, index) => {
        const nameEn = String(raw.nameEn ?? "").trim();
        const nameAr = String(raw.nameAr ?? "").trim();
        const categorySlug = String(raw.categorySlug ?? "").trim();
        const unit = String(raw.unit ?? "").trim() || "piece";
        const units = String(raw.units ?? "").trim();

        const reasons: string[] = [];

        if (!nameEn || nameEn.length < 2)
          reasons.push(String(t("dataTable.importReasonNameEnRequired")));
        if (!nameAr || nameAr.length < 2)
          reasons.push(String(t("dataTable.importReasonNameArRequired")));
        if (!categoryBySlug.has(categorySlug))
          reasons.push(String(t("dataTable.importReasonUnknownCategory")));
        const codes = units
          ? units.split("|").map((c) => c.trim()).filter(Boolean)
          : [];
        if (!codes.includes(unit)) codes.push(unit);
        if (codes.some((c) => !unitCodes.has(c)))
          reasons.push(String(t("dataTable.importReasonUnitInvalid")));

        const dedupKey = `${nameAr.toLowerCase()}|${categorySlug}`;
        if (seen.has(dedupKey))
          reasons.push(String(t("dataTable.importReasonDuplicateInFile")));
        else seen.add(dedupKey);

        return {
          rowNumber: index + 1,
          status: reasons.length === 0 ? ("valid" as const) : ("invalid" as const),
          reasons,
          nameEn,
          nameAr,
          categorySlug,
          unit,
          units,
        };
      });

      return { rows };
    },
    [categoryBySlug, unitCodes, t],
  );

  // ---- Import: commitFile ----
  const commitFile = useCallback(
    async ({
      rowsToCommit,
      reviewRows,
    }: {
      file: ParsedImportFile;
      reviewRows: ItemImportRow[];
      rowsToCommit: ItemImportRow[];
    }): Promise<ItemImportRow[]> => {
      const payload = rowsToCommit.map((r) => ({
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        categorySlug: r.categorySlug,
        unit: r.unit,
        units: r.units || undefined,
      }));

      const result = await importRows.mutateAsync({ rows: payload });

      // Map server results back to review rows
      const updatedRows = [...reviewRows];
      let commitIndex = 0;
      for (let i = 0; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        if (!row || row.status !== "valid") continue;
        const serverResult = result.results[commitIndex];
        commitIndex++;
        if (!serverResult) continue;
        if (serverResult.action === "error") {
          updatedRows[i] = {
            ...row,
            status: "invalid" as const,
            reasons: [serverResult.message ?? String(t("errors.unknown"))],
          };
        } else {
          updatedRows[i] = {
            ...row,
            status: "done" as const,
          };
        }
      }

      return updatedRows;
    },
    [importRows, t],
  );

  // ---- Import columns for review dialog ----
  const importColumns = useMemo<ImportReviewColumn<ItemImportRow>[]>(
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
        header: String(t("admin.items.nameAr")),
        cell: (row) => row.nameAr,
      },
      {
        id: "nameEn",
        header: String(t("admin.items.nameEn")),
        cell: (row) => row.nameEn,
      },
      {
        id: "categorySlug",
        header: String(t("admin.items.category")),
        cell: (row) => row.categorySlug,
      },
      {
        id: "unit",
        header: String(t("admin.items.unit")),
        cell: (row) => (row.units ? `${row.unit} (${row.units})` : row.unit),
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

  // ---- Bulk actions helpers ----
  const selectedIds = useMemo(
    () =>
      table
        .getFilteredSelectedRowModel()
        .rows.map((r) => r.original.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowSelection, table],
  );

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    bulkApprove.mutate({ ids: selectedIds });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(String(t("admin.common.confirmDelete")))) return;
    bulkDelete.mutate({ ids: selectedIds });
  };

  const handleExportSelected = () => {
    const rows = table
      .getFilteredSelectedRowModel()
      .rows.map((r) => r.original);
    if (rows.length === 0) return;
    const csv = rowsToCsv(
      ["nameEn", "nameAr", "categorySlug", "unit", "units", "status", "source"],
      rows.map((row) => {
        const links = [...row.itemUnits].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        );
        return {
          nameEn: row.nameEn ?? "",
          nameAr: row.nameAr ?? "",
          categorySlug: row.category.nameEn,
          unit: links.find((l) => l.isDefault)?.unit.code ?? links[0]?.unit.code ?? "",
          units: links.map((l) => l.unit.code).join("|"),
          status: row.status,
          source: row.source,
        };
      }),
    );
    downloadCsv("items-selected.csv", csv);
    toast.success(
      String(t("dataTable.exportSuccess", { count: rows.length })),
    );
  };

  return (
    <div className={isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"}>
      <EntityPageHeader title={String(t("admin.items.title"))} />

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(v) => setResolvedGlobalFilter(v)}
            searchPlaceholder={String(t("dataTable.searchItemsHint"))}
            filterSlot={
              <>
                <DataTableFacetedFilter
                  column={table.getColumn("category")}
                  title={String(t("admin.items.category"))}
                  options={categoryOptions}
                />
                <DataTableFacetedFilter
                  column={table.getColumn("unit")}
                  title={String(t("admin.items.unit"))}
                  options={unitOptions}
                />
                <DataTableFacetedFilter
                  column={table.getColumn("status")}
                  title={String(t("admin.items.status"))}
                  options={[
                    {
                      label: String(t("admin.items.statusApproved")),
                      value: "approved",
                    },
                    {
                      label: String(t("admin.items.statusPending")),
                      value: "pending_review",
                    },
                    {
                      label: String(t("admin.items.statusMerged")),
                      value: "merged",
                    },
                  ]}
                />
                <DataTableFacetedFilter
                  column={table.getColumn("source")}
                  title={String(t("admin.items.source"))}
                  options={[
                    { label: "seed", value: "seed" },
                    { label: "customer", value: "customer" },
                    { label: "admin", value: "admin" },
                  ]}
                />
                <DataTableDateRangeFilter
                  column={table.getColumn("createdAt")!}
                  title="Created"
                />
              </>
            }
          >
            <DataTableViewOptions table={table} />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    className="size-8"
                    onClick={() => void handleServerExport()}
                    disabled={isExporting}
                    aria-label={String(t("dataTable.export.export"))}
                  >
                    <DownloadIcon className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>{String(t("dataTable.export.export"))}</TooltipContent>
            </Tooltip>
            <ImportReviewDialog<ItemImportRow>
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
                  <TooltipContent>{String(t("dataTable.importCsv"))}</TooltipContent>
                </Tooltip>
              }
              columns={importColumns}
              previewFile={previewFile}
              commitFile={commitFile}
              getRowId={(row) => row.rowNumber}
              onCommitted={() => void invalidateList()}
            />
            <AddItemDialog
              categories={categories}
              units={units}
              locale={locale}
              onCreated={() => void invalidateList()}
            />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleBulkApprove}
                    disabled={bulkApprove.isPending}
                  >
                    <CheckIcon className="me-1 size-3.5" />
                    {String(t("admin.items.statusApproved"))}
                  </Button>
                }
              />
              <TooltipContent>
                {String(t("admin.items.statusApproved"))}
              </TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleExportSelected}
            >
              <DownloadIcon className="me-1 size-3.5" />
              {String(t("dataTable.export.export"))}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
            >
              <TrashIcon className="me-1 size-3.5" />
              {String(t("admin.common.delete"))}
            </Button>
          </DataTableActionBar>
        }
      />
    </div>
  );
}
