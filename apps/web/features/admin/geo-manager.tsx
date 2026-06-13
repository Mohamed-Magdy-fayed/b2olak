"use client";

/**
 * geo-manager.tsx
 *
 * Single expandable sub-row data table for Coverage Areas:
 *   Cities → expand → Districts → expand → Areas
 *
 * Data source: admin.geo.tree (returns the full nested tree in one query).
 * All create/update/delete/bulk/import mutations are dispatched by row.level
 * to the matching cities / districts / areas sub-routers.
 */

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import {
  MoreHorizontalIcon,
  DownloadIcon,
  PlusIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Trash2Icon,
  UploadIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  DataTableFacetedFilter,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  EntityPageHeader,
  createEntityActionsColumn,
  createExpandColumn,
  createSelectColumn,
  downloadCsv,
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
import { useTRPC } from "@/lib/trpc/client";

// ── GeoTreeRow type ────────────────────────────────────────────────────────────

type GeoLevel = "city" | "district" | "area";

type GeoTreeRow = {
  id: string;
  level: GeoLevel;
  parentId: string | null;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
  isActive: boolean;
  childCount: number;
  subRows?: GeoTreeRow[];
};

// ── GeoImportRow type ──────────────────────────────────────────────────────────

type GeoImportRow = ImportReviewRow & {
  nameEn: string;
  nameAr: string;
  sortOrder: number;
};

// ── Form state ─────────────────────────────────────────────────────────────────

type GeoFormState = {
  /** set when editing an existing row */
  id?: string;
  /** level being created/edited */
  level: GeoLevel;
  /** parent id (cityId for district, districtId for area) — null for cities */
  parentId: string | null;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyGeoForm = (
  level: GeoLevel,
  parentId: string | null,
): GeoFormState => ({
  level,
  parentId,
  nameEn: "",
  nameAr: "",
  sortOrder: 0,
  isActive: true,
});

// ── Import dialog state ────────────────────────────────────────────────────────

type ImportTarget =
  | { level: "city" }
  | { level: "district"; cityId: string }
  | { level: "area"; districtId: string };

// ── Import validation helper ───────────────────────────────────────────────────

function validateGeoImportRows(
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
      status: reasons.length === 0 ? ("valid" as const) : ("invalid" as const),
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

// ── Import review columns ──────────────────────────────────────────────────────

function buildGeoImportColumns(
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

// ── GeoFormDialog ──────────────────────────────────────────────────────────────

function GeoFormDialog({
  form,
  setForm,
  onSubmit,
  isSubmitting,
}: {
  form: GeoFormState | null;
  setForm: (f: GeoFormState | null) => void;
  onSubmit: (f: GeoFormState) => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();
  if (!form) return null;

  const editTitle =
    form.level === "city"
      ? String(t("admin.geo.editCity"))
      : form.level === "district"
        ? String(t("admin.geo.editDistrict"))
        : String(t("admin.geo.editArea"));

  const addTitle =
    form.level === "city"
      ? String(t("admin.geo.addCity"))
      : form.level === "district"
        ? String(t("admin.geo.addDistrict"))
        : String(t("admin.geo.addArea"));

  return (
    <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.id ? editTitle : addTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.geo.nameAr"))}</Label>
            <Input
              dir="rtl"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{String(t("admin.geo.nameEn"))}</Label>
            <Input
              dir="ltr"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
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
            {String(t("admin.geo.isActive"))}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setForm(null)}>
            {String(t("common.cancel"))}
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={isSubmitting}>
            {String(t("common.save"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── GeoManager — root export ───────────────────────────────────────────────────

// Global filter function: searches both name fields and the level label across
// the flat/expanded rows.
const geoGlobalFilter: FilterFn<GeoTreeRow> = (row, _columnId, value) => {
  if (typeof value !== "string" || !value.trim()) return true;
  const q = value.toLowerCase();
  return (
    row.original.nameEn.toLowerCase().includes(q) ||
    row.original.nameAr.toLowerCase().includes(q)
  );
};

export function GeoManager() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();

  // ── Data fetching ────────────────────────────────────────────────────────────

  const treeOpts = trpc.admin.geo.tree.queryOptions();
  const { data: rawTree, isLoading } = useQuery(treeOpts);

  const invalidateTree = useCallback(
    () => queryClient.invalidateQueries({ queryKey: treeOpts.queryKey }),
    [queryClient, treeOpts.queryKey],
  );

  // Map raw tree → GeoTreeRow[]
  const treeRows = useMemo<GeoTreeRow[]>(() => {
    if (!rawTree) return [];
    return rawTree.map((city) => ({
      id: city.id,
      level: "city" as const,
      parentId: null,
      nameEn: city.nameEn,
      nameAr: city.nameAr,
      sortOrder: city.sortOrder,
      isActive: city.isActive,
      childCount: city.districts.length,
      subRows: city.districts.map((district) => ({
        id: district.id,
        level: "district" as const,
        parentId: city.id,
        nameEn: district.nameEn,
        nameAr: district.nameAr,
        sortOrder: district.sortOrder,
        isActive: district.isActive,
        childCount: district.areas.length,
        subRows: district.areas.map((area) => ({
          id: area.id,
          level: "area" as const,
          parentId: district.id,
          nameEn: area.nameEn,
          nameAr: area.nameAr,
          sortOrder: area.sortOrder,
          isActive: area.isActive,
          childCount: 0,
          subRows: undefined,
        })),
      })),
    }));
  }, [rawTree]);

  // ── Form / import dialog state ───────────────────────────────────────────────

  const [form, setForm] = useState<GeoFormState | null>(null);
  const [importTarget, setImportTarget] = useState<ImportTarget | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // ── Mutations: cities ────────────────────────────────────────────────────────

  const citiesCreate = useMutation(
    trpc.admin.geo.cities.create.mutationOptions({
      onSuccess: () => void invalidateTree(),
    }),
  );
  const citiesUpdate = useMutation(
    trpc.admin.geo.cities.update.mutationOptions({
      onSuccess: () => void invalidateTree(),
    }),
  );
  const citiesDelete = useMutation(
    trpc.admin.geo.cities.delete.mutationOptions({
      onSuccess: () => void invalidateTree(),
    }),
  );
  const citiesBulkSetActive = useMutation(
    trpc.admin.geo.cities.bulkSetActive.mutationOptions({
      onSuccess: () => { void invalidateTree(); setRowSelection({}); },
    }),
  );
  const citiesBulkDelete = useMutation(
    trpc.admin.geo.cities.bulkDelete.mutationOptions({
      onSuccess: () => { void invalidateTree(); setRowSelection({}); },
    }),
  );
  const citiesImportRows = useMutation(
    trpc.admin.geo.cities.importRows.mutationOptions(),
  );

  // ── Mutations: districts ─────────────────────────────────────────────────────

  const districtsCreate = useMutation(
    trpc.admin.geo.districts.create.mutationOptions({
      onSuccess: () => void invalidateTree(),
    }),
  );
  const districtsUpdate = useMutation(
    trpc.admin.geo.districts.update.mutationOptions({
      onSuccess: () => void invalidateTree(),
    }),
  );
  const districtsDelete = useMutation(
    trpc.admin.geo.districts.delete.mutationOptions({
      onSuccess: () => void invalidateTree(),
    }),
  );
  const districtsBulkSetActive = useMutation(
    trpc.admin.geo.districts.bulkSetActive.mutationOptions({
      onSuccess: () => { void invalidateTree(); setRowSelection({}); },
    }),
  );
  const districtsBulkDelete = useMutation(
    trpc.admin.geo.districts.bulkDelete.mutationOptions({
      onSuccess: () => { void invalidateTree(); setRowSelection({}); },
    }),
  );
  const districtsImportRows = useMutation(
    trpc.admin.geo.districts.importRows.mutationOptions(),
  );

  // ── Mutations: areas ─────────────────────────────────────────────────────────

  const areasCreate = useMutation(
    trpc.admin.geo.areas.create.mutationOptions({
      onSuccess: () => void invalidateTree(),
    }),
  );
  const areasUpdate = useMutation(
    trpc.admin.geo.areas.update.mutationOptions({
      onSuccess: () => void invalidateTree(),
    }),
  );
  const areasDelete = useMutation(
    trpc.admin.geo.areas.delete.mutationOptions({
      onSuccess: () => void invalidateTree(),
    }),
  );
  const areasBulkSetActive = useMutation(
    trpc.admin.geo.areas.bulkSetActive.mutationOptions({
      onSuccess: () => { void invalidateTree(); setRowSelection({}); },
    }),
  );
  const areasBulkDelete = useMutation(
    trpc.admin.geo.areas.bulkDelete.mutationOptions({
      onSuccess: () => { void invalidateTree(); setRowSelection({}); },
    }),
  );
  const areasImportRows = useMutation(
    trpc.admin.geo.areas.importRows.mutationOptions(),
  );

  const isFormSubmitting =
    citiesCreate.isPending ||
    citiesUpdate.isPending ||
    districtsCreate.isPending ||
    districtsUpdate.isPending ||
    areasCreate.isPending ||
    areasUpdate.isPending;

  // ── Form submit ───────────────────────────────────────────────────────────────

  function handleFormSubmit(f: GeoFormState) {
    const payload = {
      nameEn: f.nameEn,
      nameAr: f.nameAr,
      sortOrder: f.sortOrder,
      isActive: f.isActive,
    };
    if (f.id) {
      // edit
      if (f.level === "city") citiesUpdate.mutate({ id: f.id, ...payload });
      else if (f.level === "district")
        districtsUpdate.mutate({ id: f.id, ...payload });
      else areasUpdate.mutate({ id: f.id, ...payload });
    } else {
      // create
      if (f.level === "city") {
        citiesCreate.mutate(payload);
      } else if (f.level === "district") {
        if (!f.parentId) return;
        districtsCreate.mutate({ cityId: f.parentId, ...payload });
      } else {
        if (!f.parentId) return;
        areasCreate.mutate({ districtId: f.parentId, ...payload });
      }
    }
    setForm(null);
  }

  // ── Import handlers ───────────────────────────────────────────────────────────

  const importColumns = useMemo(
    () => buildGeoImportColumns(t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  async function handleImportPreview(
    file: ParsedImportFile,
  ): Promise<{ ignoredColumns?: string[]; rows: GeoImportRow[] }> {
    const knownCols = new Set(["nameEn", "nameAr", "sortOrder"]);
    const ignoredColumns = file.headers.filter((h) => !knownCols.has(h));
    const rows = validateGeoImportRows(file, t);
    return { ignoredColumns, rows };
  }

  async function handleImportCommit(args: {
    file: ParsedImportFile;
    reviewRows: GeoImportRow[];
    rowsToCommit: GeoImportRow[];
  }): Promise<GeoImportRow[]> {
    if (!importTarget) throw new Error("No import target");
    const validRows = args.rowsToCommit.filter((r) => r.status === "valid");
    const mappedRows = validRows.map((r) => ({
      nameEn: r.nameEn,
      nameAr: r.nameAr,
      sortOrder: r.sortOrder,
    }));

    if (importTarget.level === "city") {
      await citiesImportRows.mutateAsync({ rows: mappedRows });
    } else if (importTarget.level === "district") {
      await districtsImportRows.mutateAsync({
        cityId: importTarget.cityId,
        rows: mappedRows,
      });
    } else {
      await areasImportRows.mutateAsync({
        districtId: importTarget.districtId,
        rows: mappedRows,
      });
    }

    void invalidateTree();
    return args.reviewRows.map((r) =>
      r.status === "valid" ? { ...r, status: "done" as const } : r,
    );
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────────

  function handleBulkSetActive(isActive: boolean) {
    const selected = table.getFilteredSelectedRowModel().rows;
    if (selected.length === 0) return;

    const cityIds = selected
      .filter((r) => r.original.level === "city")
      .map((r) => r.original.id);
    const districtIds = selected
      .filter((r) => r.original.level === "district")
      .map((r) => r.original.id);
    const areaIds = selected
      .filter((r) => r.original.level === "area")
      .map((r) => r.original.id);

    if (cityIds.length > 0)
      citiesBulkSetActive.mutate({ ids: cityIds, isActive });
    if (districtIds.length > 0)
      districtsBulkSetActive.mutate({ ids: districtIds, isActive });
    if (areaIds.length > 0)
      areasBulkSetActive.mutate({ ids: areaIds, isActive });
  }

  function handleBulkDelete() {
    const selected = table.getFilteredSelectedRowModel().rows;
    if (selected.length === 0) return;
    if (!window.confirm(String(t("admin.common.confirmDelete")))) return;

    const cityIds = selected
      .filter((r) => r.original.level === "city")
      .map((r) => r.original.id);
    const districtIds = selected
      .filter((r) => r.original.level === "district")
      .map((r) => r.original.id);
    const areaIds = selected
      .filter((r) => r.original.level === "area")
      .map((r) => r.original.id);

    if (cityIds.length > 0) citiesBulkDelete.mutate({ ids: cityIds });
    if (districtIds.length > 0) districtsBulkDelete.mutate({ ids: districtIds });
    if (areaIds.length > 0) areasBulkDelete.mutate({ ids: areaIds });
  }

  // ── Export ────────────────────────────────────────────────────────────────────

  function handleExport() {
    // Flatten the full tree into leaf-oriented rows:
    // Each area row gets city + district + area columns.
    // Districts with no areas and cities with no districts emit partial rows.
    const exportRows: {
      city: string;
      district: string;
      area: string;
      sortOrder: number;
      isActive: string;
    }[] = [];

    for (const city of treeRows) {
      if (city.subRows && city.subRows.length > 0) {
        for (const district of city.subRows) {
          if (district.subRows && district.subRows.length > 0) {
            for (const area of district.subRows) {
              exportRows.push({
                city: city.nameEn,
                district: district.nameEn,
                area: area.nameEn,
                sortOrder: area.sortOrder,
                isActive: String(area.isActive),
              });
            }
          } else {
            exportRows.push({
              city: city.nameEn,
              district: district.nameEn,
              area: "",
              sortOrder: district.sortOrder,
              isActive: String(district.isActive),
            });
          }
        }
      } else {
        exportRows.push({
          city: city.nameEn,
          district: "",
          area: "",
          sortOrder: city.sortOrder,
          isActive: String(city.isActive),
        });
      }
    }

    const csv = rowsToCsv(["city", "district", "area", "sortOrder", "isActive"], exportRows);
    downloadCsv("coverage-areas.csv", csv);
  }

  // ── Active filter options ─────────────────────────────────────────────────────

  const activeOptions = [
    { label: String(t("admin.common.active")), value: "true" },
    { label: String(t("admin.common.inactive")), value: "false" },
  ];

  const levelOptions = [
    { label: String(t("admin.geo.levelCity")), value: "city" },
    { label: String(t("admin.geo.levelDistrict")), value: "district" },
    { label: String(t("admin.geo.levelArea")), value: "area" },
  ];

  // ── Columns ───────────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<GeoTreeRow>[]>(
    () => [
      createExpandColumn<GeoTreeRow>(),
      createSelectColumn<GeoTreeRow>(),

      {
        id: "name",
        accessorFn: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
        enableSorting: true,
        enableHiding: true,
        meta: { label: `${String(t("admin.geo.nameAr"))} / ${String(t("admin.geo.nameEn"))}` },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={`${String(t("admin.geo.nameAr"))} / ${String(t("admin.geo.nameEn"))}`}
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
        id: "level",
        accessorKey: "level",
        enableSorting: false,
        enableHiding: true,
        size: 100,
        meta: {
          label: String(t("admin.geo.level")),
          filterVariant: "multiSelect" as const,
          options: levelOptions,
        },
        filterFn: (row, _id, filterValue: unknown) => {
          const arr = filterValue as string[] | undefined;
          if (!arr || arr.length === 0) return true;
          return arr.includes(row.original.level);
        },
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">
            {String(t("admin.geo.level"))}
          </span>
        ),
        cell: ({ row }) => {
          const level = row.original.level;
          const label =
            level === "city"
              ? String(t("admin.geo.levelCity"))
              : level === "district"
                ? String(t("admin.geo.levelDistrict"))
                : String(t("admin.geo.levelArea"));
          const variant =
            level === "city"
              ? ("default" as const)
              : level === "district"
                ? ("secondary" as const)
                : ("outline" as const);
          return <Badge variant={variant}>{label}</Badge>;
        },
      },

      {
        id: "childCount",
        accessorKey: "childCount",
        enableSorting: true,
        enableHiding: true,
        size: 120,
        meta: { label: String(t("admin.geo.districtCount", { count: "#" })) },
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">
            {String(t("admin.geo.districtCount", { count: "#" }))}
          </span>
        ),
        cell: ({ row }) => {
          if (row.original.level === "area") {
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          const count = row.original.childCount;
          const label =
            row.original.level === "city"
              ? String(t("admin.geo.districtCount", { count }))
              : String(t("admin.geo.areaCount", { count }));
          return (
            <span className="text-muted-foreground text-xs tabular-nums">
              {label}
            </span>
          );
        },
      },

      {
        id: "sortOrder",
        accessorKey: "sortOrder",
        enableSorting: true,
        enableHiding: true,
        size: 90,
        meta: { label: String(t("admin.geo.sortOrder")) },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={String(t("admin.geo.sortOrder"))}
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
        enableHiding: true,
        size: 110,
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

      createEntityActionsColumn<GeoTreeRow>({
        t,
        size: 56,
        cell: ({ row }) => {
          const geo = row.original;
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
                {/* Edit */}
                <DropdownMenuItem
                  onClick={() =>
                    setForm({
                      id: geo.id,
                      level: geo.level,
                      parentId: geo.parentId,
                      nameEn: geo.nameEn,
                      nameAr: geo.nameAr,
                      sortOrder: geo.sortOrder,
                      isActive: geo.isActive,
                    })
                  }
                >
                  {String(t("admin.common.edit"))}
                </DropdownMenuItem>

                {/* Add child (city → add district, district → add area) */}
                {geo.level === "city" && (
                  <DropdownMenuItem
                    onClick={() =>
                      setForm(emptyGeoForm("district", geo.id))
                    }
                  >
                    {String(t("admin.geo.addDistrict"))}
                  </DropdownMenuItem>
                )}
                {geo.level === "district" && (
                  <DropdownMenuItem
                    onClick={() => setForm(emptyGeoForm("area", geo.id))}
                  >
                    {String(t("admin.geo.addArea"))}
                  </DropdownMenuItem>
                )}

                {/* Import children */}
                {geo.level === "city" && (
                  <DropdownMenuItem
                    onClick={() =>
                      setImportTarget({ level: "district", cityId: geo.id })
                    }
                  >
                    {String(t("admin.geo.importDistricts"))}
                  </DropdownMenuItem>
                )}
                {geo.level === "district" && (
                  <DropdownMenuItem
                    onClick={() =>
                      setImportTarget({
                        level: "area",
                        districtId: geo.id,
                      })
                    }
                  >
                    {String(t("admin.geo.importAreas"))}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Delete */}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (
                      window.confirm(String(t("admin.common.confirmDelete")))
                    ) {
                      if (geo.level === "city")
                        citiesDelete.mutate({ id: geo.id });
                      else if (geo.level === "district")
                        districtsDelete.mutate({ id: geo.id });
                      else areasDelete.mutate({ id: geo.id });
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
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, t],
  );

  // ── Table instance ────────────────────────────────────────────────────────────

  const { table, globalFilter, setGlobalFilter } = useDataTable<GeoTreeRow>({
    mode: "client",
    data: treeRows,
    columns,
    getRowId: (row) => row.id,
    controlled: {
      rowSelection,
      onRowSelectionChange: setRowSelection,
      // Let internal state handle the rest (no URL state — simple page)
      pagination: { pageIndex: 0, pageSize: 50 },
      onPaginationChange: () => undefined,
      sorting: [],
      onSortingChange: () => undefined,
      columnFilters: [],
      onColumnFiltersChange: () => undefined,
      globalFilter: "",
      onGlobalFilterChange: () => undefined,
      columnVisibility: {},
      onColumnVisibilityChange: () => undefined,
      columnPinning: { left: ["expand", "select"], right: ["actions"] },
      onColumnPinningChange: () => undefined,
    },
    getSubRows: (row) => row.subRows,
    globalFilterFn: geoGlobalFilter,
    initialColumnPinning: { left: ["expand", "select"], right: ["actions"] },
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <EntityPageHeader title={String(t("admin.geo.title"))} />

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={globalFilter}
            onGlobalFilterChange={(v) => setGlobalFilter(v)}
            searchPlaceholder={String(t("dataTable.searchGeoHint"))}
            filterSlot={
              <>
                <DataTableFacetedFilter
                  column={table.getColumn("isActive")}
                  title={String(t("admin.geo.isActive"))}
                  options={activeOptions}
                />
                <DataTableFacetedFilter
                  column={table.getColumn("level")}
                  title={String(t("admin.geo.level"))}
                  options={levelOptions}
                />
              </>
            }
          >
            <DataTableViewOptions table={table} />

            {/* Export */}
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

            {/* Import cities */}
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
                          aria-label={String(t("admin.geo.importCities"))}
                        >
                          <UploadIcon className="size-3.5" />
                        </Button>
                      }
                      columns={importColumns}
                      previewFile={handleImportPreview}
                      commitFile={(args) => {
                        setImportTarget({ level: "city" });
                        return handleImportCommit(args);
                      }}
                      getRowId={(row) => row.rowNumber}
                      onCommitted={() => void invalidateTree()}
                      title={String(t("admin.geo.importCities"))}
                      description={String(
                        t("dataTable.importReviewDescription"),
                      )}
                    />
                  </span>
                }
              />
              <TooltipContent>
                {String(t("admin.geo.importCities"))}
              </TooltipContent>
            </Tooltip>

            {/* Add city */}
            <Button
              size="sm"
              type="button"
              onClick={() => setForm(emptyGeoForm("city", null))}
            >
              <PlusIcon className="size-3.5" />
              {String(t("admin.geo.addCity"))}
            </Button>
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => handleBulkSetActive(true)}
              disabled={
                citiesBulkSetActive.isPending ||
                districtsBulkSetActive.isPending ||
                areasBulkSetActive.isPending
              }
            >
              <CheckCircle2Icon className="size-3.5" />
              {String(t("admin.common.active"))}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => handleBulkSetActive(false)}
              disabled={
                citiesBulkSetActive.isPending ||
                districtsBulkSetActive.isPending ||
                areasBulkSetActive.isPending
              }
            >
              <XCircleIcon className="size-3.5" />
              {String(t("admin.common.inactive"))}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleBulkDelete}
              disabled={
                citiesBulkDelete.isPending ||
                districtsBulkDelete.isPending ||
                areasBulkDelete.isPending
              }
            >
              <Trash2Icon className="size-3.5" />
              {String(t("admin.common.delete"))}
            </Button>
          </DataTableActionBar>
        }
      />

      {/* Add/Edit form dialog */}
      <GeoFormDialog
        form={form}
        setForm={setForm}
        onSubmit={handleFormSubmit}
        isSubmitting={isFormSubmitting}
      />

      {/* Import dialog for row-action-triggered imports (districts/areas) */}
      {importTarget !== null && (
        <ImportReviewDialog<GeoImportRow>
          trigger={<span />}
          columns={importColumns}
          previewFile={handleImportPreview}
          commitFile={handleImportCommit}
          getRowId={(row) => row.rowNumber}
          onCommitted={() => {
            void invalidateTree();
            setImportTarget(null);
          }}
          title={
            importTarget.level === "city"
              ? String(t("admin.geo.importCities"))
              : importTarget.level === "district"
                ? String(t("admin.geo.importDistricts"))
                : String(t("admin.geo.importAreas"))
          }
          description={String(t("dataTable.importReviewDescription"))}
        />
      )}
    </div>
  );
}
