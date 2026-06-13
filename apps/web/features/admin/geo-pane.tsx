"use client";

/**
 * geo-pane.tsx
 *
 * Reusable single-level pane (cities / districts / areas) built on the
 * client-mode DataTable system.
 *
 * Key design decisions:
 * - Uses useDataTable (mode:"client") with plain useState — no URL state,
 *   since all three panes share one URL.
 * - Cascading row selection is implemented by rendering TableRow with an
 *   onClick, using the same tanstack table model (so checkbox selection and
 *   cascading "active row" coexist independently).
 * - Import, export, bulk activate/deactivate/delete are all wired here.
 *   The parent (geo-manager.tsx) supplies the mutation callbacks.
 */

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  CheckCircle2Icon,
  DownloadIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";

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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import {
  DataTableActionBar,
  DataTableFacetedFilter,
  DataTablePagination,
  DataTableToolbar,
  createEntityActionsColumn,
  createSelectColumn,
  downloadCsv,
  getPinningClassName,
  rowsToCsv,
  useDataTable,
} from "@/features/core/data-table";
import {
  ImportReviewDialog,
  ImportReviewStatusBadge,
  type ImportReviewColumn,
  type ImportReviewRow,
  type ParsedImportFile,
} from "@/features/core/import-review";

// ── Shared geo row shape ───────────────────────────────────────────────────────

export type GeoRow = {
  id: string;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
  isActive: boolean;
  districtCount?: number;
  areaCount?: number;
};

// ── Shared add/edit form ───────────────────────────────────────────────────────

type GeoFormState = {
  id?: string;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyGeoForm: GeoFormState = {
  nameEn: "",
  nameAr: "",
  sortOrder: 0,
  isActive: true,
};

function GeoFormFields({
  form,
  onChange,
}: {
  form: GeoFormState;
  onChange: (next: GeoFormState) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{String(t("admin.geo.nameAr"))}</Label>
        <Input
          dir="rtl"
          value={form.nameAr}
          onChange={(e) => onChange({ ...form, nameAr: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{String(t("admin.geo.nameEn"))}</Label>
        <Input
          dir="ltr"
          value={form.nameEn}
          onChange={(e) => onChange({ ...form, nameEn: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{String(t("admin.geo.sortOrder"))}</Label>
        <Input
          type="number"
          dir="ltr"
          min={0}
          value={form.sortOrder}
          onChange={(e) =>
            onChange({ ...form, sortOrder: Number(e.target.value) || 0 })
          }
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
        />
        {String(t("admin.geo.isActive"))}
      </label>
    </div>
  );
}

// ── Import review row type ─────────────────────────────────────────────────────

export type GeoImportRow = ImportReviewRow & {
  nameEn: string;
  nameAr: string;
  sortOrder: number;
};

// ── Import validation ──────────────────────────────────────────────────────────

export function validateGeoImportRows(
  parsed: ParsedImportFile,
  t: ReturnType<typeof useTranslation>["t"],
): GeoImportRow[] {
  const seenNames = new Set<string>();
  return parsed.rows.map((raw, idx) => {
    const reasons: string[] = [];
    const nameEn =
      typeof raw["nameEn"] === "string" ? raw["nameEn"].trim() : "";
    const nameAr =
      typeof raw["nameAr"] === "string" ? raw["nameAr"].trim() : "";
    const sortOrderRaw = raw["sortOrder"];
    const sortOrderNum =
      sortOrderRaw !== undefined && sortOrderRaw !== ""
        ? Number(sortOrderRaw)
        : 0;

    if (!nameEn)
      reasons.push(String(t("dataTable.importReasonNameEnRequired")));
    else if (nameEn.length > 128)
      reasons.push(String(t("dataTable.importReasonNameEnTooLong")));

    if (!nameAr)
      reasons.push(String(t("dataTable.importReasonNameArRequired")));
    else if (nameAr.length > 128)
      reasons.push(String(t("dataTable.importReasonNameArTooLong")));

    if (
      sortOrderRaw !== undefined &&
      sortOrderRaw !== "" &&
      (!Number.isInteger(sortOrderNum) || sortOrderNum < 0)
    ) {
      reasons.push(String(t("dataTable.importReasonSortOrderInvalid")));
    }

    if (nameEn && seenNames.has(nameEn.toLowerCase())) {
      reasons.push(String(t("dataTable.importReasonDuplicateInFile")));
    } else if (nameEn) {
      seenNames.add(nameEn.toLowerCase());
    }

    return {
      rowNumber: idx + 1,
      status: reasons.length === 0 ? "valid" : "invalid",
      reasons,
      nameEn,
      nameAr,
      sortOrder:
        Number.isInteger(sortOrderNum) && sortOrderNum >= 0
          ? sortOrderNum
          : 0,
    };
  });
}

// ── Import review columns builder ──────────────────────────────────────────────

export function buildGeoImportColumns(
  t: ReturnType<typeof useTranslation>["t"],
): ImportReviewColumn<GeoImportRow>[] {
  return [
    {
      id: "row",
      header: "#",
      cell: (row) => row.rowNumber,
      headerClassName: "w-10",
    },
    {
      id: "status",
      header: String(t("dataTable.importStatusColumn")),
      cell: (row) => <ImportReviewStatusBadge status={row.status} />,
      headerClassName: "w-24",
    },
    {
      id: "nameEn",
      header: String(t("admin.geo.nameEn")),
      cell: (row) =>
        row.nameEn || <span className="text-destructive">—</span>,
    },
    {
      id: "nameAr",
      header: String(t("admin.geo.nameAr")),
      cell: (row) =>
        row.nameAr || <span className="text-destructive">—</span>,
    },
    {
      id: "sortOrder",
      header: String(t("admin.geo.sortOrder")),
      cell: (row) => row.sortOrder,
      headerClassName: "w-24",
    },
    {
      id: "reasons",
      header: String(t("dataTable.importResultColumn")),
      cell: (row) =>
        row.reasons.length > 0 ? (
          <span className="text-destructive text-xs">
            {row.reasons.join("; ")}
          </span>
        ) : (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {String(t("dataTable.importResultReady"))}
          </span>
        ),
    },
  ];
}

// ── SortableHeader helper ──────────────────────────────────────────────────────

function SortableHeader({
  label,
  isSorted,
  onToggle,
}: {
  label: string;
  isSorted: false | "asc" | "desc";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      onClick={onToggle}
    >
      {label}
      {isSorted === "asc" ? " ↑" : isSorted === "desc" ? " ↓" : ""}
    </button>
  );
}

// ── GeoPaneProps ───────────────────────────────────────────────────────────────

export type GeoPaneProps = {
  data: GeoRow[];
  title: string;
  addTitle: string;
  editTitle: string;
  exportFileName: string;
  /** true = show the table, false = show parentHint empty state */
  parentSelected: boolean;
  parentHint: string;
  onInvalidate: () => void;
  /** If provided, row click triggers cascading parent selection */
  onRowClick?: (id: string | null) => void;
  activeRowId?: string | null;
  // Mutations (called by parent)
  createMutation: (payload: Omit<GeoFormState, "id">) => void;
  updateMutation: (payload: GeoFormState & { id: string }) => void;
  deleteMutation: (id: string) => void;
  bulkSetActiveMutation: (ids: string[], isActive: boolean) => void;
  bulkDeleteMutation: (ids: string[]) => void;
  importEnabled: boolean;
  onImportPreview: (
    file: ParsedImportFile,
  ) => Promise<{ ignoredColumns?: string[]; rows: GeoImportRow[] }>;
  onImportCommit: (args: {
    file: ParsedImportFile;
    reviewRows: GeoImportRow[];
    rowsToCommit: GeoImportRow[];
  }) => Promise<GeoImportRow[]>;
  isCreatePending: boolean;
  isUpdatePending: boolean;
};

// ── GeoPane ────────────────────────────────────────────────────────────────────

export function GeoPane({
  data,
  title,
  addTitle,
  editTitle,
  exportFileName,
  parentSelected,
  parentHint,
  onRowClick,
  activeRowId,
  createMutation,
  updateMutation,
  deleteMutation,
  bulkSetActiveMutation,
  bulkDeleteMutation,
  importEnabled,
  onImportPreview,
  onImportCommit,
  isCreatePending,
  isUpdatePending,
}: GeoPaneProps) {
  const { t, locale } = useTranslation();
  const [form, setForm] = useState<GeoFormState | null>(null);

  // Detect which count column to show based on data shape
  const hasDistrictCount =
    data.length > 0 && data[0]?.districtCount !== undefined;
  const hasAreaCount = data.length > 0 && data[0]?.areaCount !== undefined;

  const activeOptions = [
    { label: String(t("admin.common.active")), value: "true" },
    { label: String(t("admin.common.inactive")), value: "false" },
  ];

  // ── Columns ──────────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<GeoRow>[]>(() => {
    const cols: ColumnDef<GeoRow>[] = [
      createSelectColumn<GeoRow>(),
      {
        id: "name",
        accessorFn: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
        enableSorting: true,
        meta: {
          label: `${String(t("admin.geo.nameAr"))} / ${String(t("admin.geo.nameEn"))}`,
        },
        header: ({ column }) => (
          <SortableHeader
            label={`${String(t("admin.geo.nameAr"))} / ${String(t("admin.geo.nameEn"))}`}
            isSorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const primary =
            locale === "ar" ? row.original.nameAr : row.original.nameEn;
          const secondary =
            locale === "ar" ? row.original.nameEn : row.original.nameAr;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{primary}</span>
              <span className="text-muted-foreground text-xs">{secondary}</span>
            </div>
          );
        },
      },
      {
        id: "sortOrder",
        accessorKey: "sortOrder",
        enableSorting: true,
        size: 80,
        meta: { label: String(t("admin.geo.sortOrder")) },
        header: ({ column }) => (
          <SortableHeader
            label={String(t("admin.geo.sortOrder"))}
            isSorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {row.original.sortOrder}
          </span>
        ),
      },
      {
        id: "isActive",
        accessorFn: (row) => String(row.isActive),
        enableSorting: false,
        size: 100,
        meta: {
          label: String(t("admin.geo.isActive")),
          filterVariant: "multiSelect" as const,
          options: activeOptions,
        },
        filterFn: (row, _id, filterValue: unknown) => {
          const arr = filterValue as string[] | undefined;
          if (!arr || arr.length === 0) return true;
          return arr.includes(String(row.original.isActive));
        },
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">
            {String(t("admin.geo.isActive"))}
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
      createEntityActionsColumn<GeoRow>({
        t,
        size: 110,
        cell: ({ row }) => (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setForm({
                  id: row.original.id,
                  nameEn: row.original.nameEn,
                  nameAr: row.original.nameAr,
                  sortOrder: row.original.sortOrder,
                  isActive: row.original.isActive,
                });
              }}
            >
              {String(t("admin.common.edit"))}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                if (
                  window.confirm(String(t("admin.common.confirmDelete")))
                ) {
                  deleteMutation(row.original.id);
                }
              }}
            >
              {String(t("admin.common.delete"))}
            </Button>
          </div>
        ),
      }),
    ];

    // Insert count column after sortOrder (index 3)
    if (hasDistrictCount) {
      cols.splice(3, 0, {
        id: "districtCount",
        accessorKey: "districtCount",
        enableSorting: true,
        size: 100,
        meta: { label: String(t("admin.geo.districtCount", { count: "#" })) },
        header: ({ column }) => (
          <SortableHeader
            label={String(t("admin.geo.districtCount", { count: "#" }))}
            isSorted={column.getIsSorted()}
            onToggle={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {row.original.districtCount ?? 0}
          </span>
        ),
      });
    }

    if (hasAreaCount) {
      cols.splice(3, 0, {
        id: "areaCount",
        accessorKey: "areaCount",
        enableSorting: true,
        size: 100,
        meta: { label: String(t("admin.geo.areaCount", { count: "#" })) },
        header: ({ column }) => (
          <SortableHeader
            label={String(t("admin.geo.areaCount", { count: "#" }))}
            isSorted={column.getIsSorted()}
            onToggle={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {row.original.areaCount ?? 0}
          </span>
        ),
      });
    }

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, t, hasDistrictCount, hasAreaCount]);

  // ── Table instance ────────────────────────────────────────────────────────────

  const { table, globalFilter, setGlobalFilter } = useDataTable<GeoRow>({
    mode: "client",
    data,
    columns,
    getRowId: (row) => row.id,
    initialColumnPinning: { left: ["select"], right: ["actions"] },
  });

  // ── Import columns ────────────────────────────────────────────────────────────

  const importColumns = useMemo(
    () => buildGeoImportColumns(t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  // ── Export ────────────────────────────────────────────────────────────────────

  function handleExport() {
    const rows = table.getFilteredRowModel().rows.map((r) => r.original);
    const csv = rowsToCsv(
      ["nameEn", "nameAr", "sortOrder", "isActive"],
      rows.map((r) => ({
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        sortOrder: r.sortOrder,
        isActive: String(r.isActive),
      })),
    );
    downloadCsv(exportFileName, csv);
  }

  // ── Bulk helpers ──────────────────────────────────────────────────────────────

  function getSelectedIds() {
    return table
      .getFilteredSelectedRowModel()
      .rows.map((r) => r.original.id);
  }

  // ── Form submit ───────────────────────────────────────────────────────────────

  function submitForm() {
    if (!form) return;
    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    if (form.id) {
      updateMutation({ id: form.id, ...payload });
    } else {
      createMutation(payload);
    }
    // Close optimistically; the list refreshes via the mutation's invalidate,
    // and any failure surfaces as a toast.
    setForm(null);
  }

  // ── Empty state when no parent selected ──────────────────────────────────────

  if (!parentSelected) {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold">{title}</span>
        <p className="text-muted-foreground py-8 text-center text-sm">
          {parentHint}
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const tableRows = table.getRowModel().rows;
  const visibleLeafColumns = table.getVisibleLeafColumns();
  const colSpan = visibleLeafColumns.length || 1;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <span className="text-sm font-semibold">{title}</span>

      {/* Toolbar */}
      <DataTableToolbar
        table={table}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder={String(t("dataTable.searchGeoHint"))}
        filterSlot={
          <DataTableFacetedFilter
            column={table.getColumn("isActive")}
            title={String(t("admin.geo.isActive"))}
            options={activeOptions}
          />
        }
      >
        <Button
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setForm(emptyGeoForm)}
        >
          <PlusIcon className="size-3.5" />
          {addTitle}
        </Button>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                type="button"
                aria-label={String(t("dataTable.export.export"))}
                onClick={handleExport}
              >
                <DownloadIcon className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent>
            {String(t("dataTable.export.export"))}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <span>
                <ImportReviewDialog<GeoImportRow>
                  trigger={
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      type="button"
                      disabled={!importEnabled}
                      aria-label={String(t("dataTable.importCsv"))}
                    >
                      <UploadIcon className="size-3.5" />
                    </Button>
                  }
                  columns={importColumns}
                  previewFile={onImportPreview}
                  commitFile={onImportCommit}
                  getRowId={(row) => row.rowNumber}
                  onCommitted={() => {
                    /* invalidation is wired in geo-manager via onCommitted */
                  }}
                  title={String(t("dataTable.importReviewTitle"))}
                  description={String(t("dataTable.importReviewDescription"))}
                />
              </span>
            }
          />
          <TooltipContent>{String(t("dataTable.importCsv"))}</TooltipContent>
        </Tooltip>
      </DataTableToolbar>

      {/* Table with row-click support for cascading selection */}
      <div className="flex w-full min-w-0 flex-col gap-3">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={getPinningClassName(header.column)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tableRows.length > 0 ? (
              tableRows.map((row) => {
                const isActiveRow = activeRowId === row.original.id;
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={cn(
                      onRowClick ? "cursor-pointer" : "",
                      isActiveRow
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "",
                    )}
                    onClick={
                      onRowClick
                        ? () =>
                            onRowClick(
                              isActiveRow ? null : row.original.id,
                            )
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={getPinningClassName(cell.column)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-24 text-center text-muted-foreground"
                >
                  {String(t("dataTable.noResults"))}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <DataTablePagination table={table} />
      </div>

      {/* Bulk action bar */}
      <DataTableActionBar table={table}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            const ids = getSelectedIds();
            if (ids.length > 0) {
              bulkSetActiveMutation(ids, true);
              table.resetRowSelection();
            }
          }}
        >
          <CheckCircle2Icon className="size-3.5" />
          {String(t("admin.common.active"))}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            const ids = getSelectedIds();
            if (ids.length > 0) {
              bulkSetActiveMutation(ids, false);
              table.resetRowSelection();
            }
          }}
        >
          <XCircleIcon className="size-3.5" />
          {String(t("admin.common.inactive"))}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
          onClick={() => {
            const ids = getSelectedIds();
            if (
              ids.length > 0 &&
              window.confirm(String(t("admin.common.confirmDelete")))
            ) {
              bulkDeleteMutation(ids);
              table.resetRowSelection();
            }
          }}
        >
          <Trash2Icon className="size-3.5" />
          {String(t("admin.common.delete"))}
        </Button>
      </DataTableActionBar>

      {/* Add/Edit dialog */}
      <Dialog
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? editTitle : addTitle}</DialogTitle>
          </DialogHeader>
          {form ? (
            <GeoFormFields form={form} onChange={setForm} />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              {String(t("common.cancel"))}
            </Button>
            <Button
              onClick={submitForm}
              disabled={isCreatePending || isUpdatePending}
            >
              {String(t("common.save"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
