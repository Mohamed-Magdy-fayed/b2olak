"use client";

/**
 * geo-manager.tsx
 *
 * Three-pane cascading UX: Cities → Districts → Areas.
 *
 * Each pane is a GeoPane (client-mode data table with toolbar, pagination,
 * import, export, and bulk-action bar).  Clicking a city row loads its
 * districts; clicking a district row loads its areas.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { Card, CardContent } from "@workspace/ui/components/card";

import {
  EntityPageHeader,
} from "@/features/core/data-table";
import type { ParsedImportFile } from "@/features/core/import-review";
import { useTRPC } from "@/lib/trpc/client";

import {
  GeoPane,
  validateGeoImportRows,
  type GeoImportRow,
  type GeoRow,
} from "./geo-pane";

// ── CitiesPane ─────────────────────────────────────────────────────────────────

function CitiesPane({
  selectedCityId,
  onSelectCity,
}: {
  selectedCityId: string | null;
  onSelectCity: (id: string | null) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const listOpts = trpc.admin.geo.cities.list.queryOptions();
  const { data: rawCities } = useQuery(listOpts);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listOpts.queryKey });

  const cities: GeoRow[] = (rawCities ?? []).map((c) => ({
    id: c.id,
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    districtCount: c.districtCount,
  }));

  const create = useMutation(
    trpc.admin.geo.cities.create.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const update = useMutation(
    trpc.admin.geo.cities.update.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const remove = useMutation(
    trpc.admin.geo.cities.delete.mutationOptions({
      onSuccess: () => {
        void invalidate();
        onSelectCity(null);
      },
    }),
  );
  const bulkSetActive = useMutation(
    trpc.admin.geo.cities.bulkSetActive.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const bulkDelete = useMutation(
    trpc.admin.geo.cities.bulkDelete.mutationOptions({
      onSuccess: () => {
        void invalidate();
        onSelectCity(null);
      },
    }),
  );
  const importRows = useMutation(
    trpc.admin.geo.cities.importRows.mutationOptions(),
  );

  async function handleImportPreview(file: ParsedImportFile) {
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
    const validRows = args.rowsToCommit.filter((r) => r.status === "valid");
    await importRows.mutateAsync({
      rows: validRows.map((r) => ({
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        sortOrder: r.sortOrder,
      })),
    });
    void invalidate();
    return args.reviewRows.map((r) =>
      r.status === "valid" ? { ...r, status: "done" as const } : r,
    );
  }

  return (
    <GeoPane
      data={cities}
      title={String(t("admin.geo.cities"))}
      addTitle={String(t("admin.geo.addCity"))}
      editTitle={String(t("admin.geo.editCity"))}
      exportFileName="cities.csv"
      parentSelected={true}
      parentHint=""
      onInvalidate={invalidate}
      onRowClick={onSelectCity}
      activeRowId={selectedCityId}
      createMutation={(payload) => create.mutate(payload)}
      updateMutation={(payload) => update.mutate(payload)}
      deleteMutation={(id) => remove.mutate({ id })}
      bulkSetActiveMutation={(ids, isActive) =>
        bulkSetActive.mutate({ ids, isActive })
      }
      bulkDeleteMutation={(ids) => bulkDelete.mutate({ ids })}
      importEnabled={true}
      onImportPreview={handleImportPreview}
      onImportCommit={handleImportCommit}
      isCreatePending={create.isPending}
      isUpdatePending={update.isPending}
    />
  );
}

// ── DistrictsPane ──────────────────────────────────────────────────────────────

function DistrictsPane({
  cityId,
  selectedDistrictId,
  onSelectDistrict,
}: {
  cityId: string | null;
  selectedDistrictId: string | null;
  onSelectDistrict: (id: string | null) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const listOpts = trpc.admin.geo.districts.list.queryOptions(
    { cityId: cityId ?? "" },
    { enabled: !!cityId },
  );
  const { data: rawDistricts } = useQuery(listOpts);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listOpts.queryKey });

  const districts: GeoRow[] = (rawDistricts ?? []).map((d) => ({
    id: d.id,
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    sortOrder: d.sortOrder,
    isActive: d.isActive,
    areaCount: d.areaCount,
  }));

  const create = useMutation(
    trpc.admin.geo.districts.create.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const update = useMutation(
    trpc.admin.geo.districts.update.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const remove = useMutation(
    trpc.admin.geo.districts.delete.mutationOptions({
      onSuccess: () => {
        void invalidate();
        onSelectDistrict(null);
      },
    }),
  );
  const bulkSetActive = useMutation(
    trpc.admin.geo.districts.bulkSetActive.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const bulkDelete = useMutation(
    trpc.admin.geo.districts.bulkDelete.mutationOptions({
      onSuccess: () => {
        void invalidate();
        onSelectDistrict(null);
      },
    }),
  );
  const importRows = useMutation(
    trpc.admin.geo.districts.importRows.mutationOptions(),
  );

  async function handleImportPreview(file: ParsedImportFile) {
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
    if (!cityId) throw new Error("No city selected");
    const validRows = args.rowsToCommit.filter((r) => r.status === "valid");
    await importRows.mutateAsync({
      cityId,
      rows: validRows.map((r) => ({
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        sortOrder: r.sortOrder,
      })),
    });
    void invalidate();
    return args.reviewRows.map((r) =>
      r.status === "valid" ? { ...r, status: "done" as const } : r,
    );
  }

  return (
    <GeoPane
      data={districts}
      title={String(t("admin.geo.districts"))}
      addTitle={String(t("admin.geo.addDistrict"))}
      editTitle={String(t("admin.geo.editDistrict"))}
      exportFileName="districts.csv"
      parentSelected={!!cityId}
      parentHint={String(t("admin.geo.selectCityFirst"))}
      onInvalidate={invalidate}
      onRowClick={onSelectDistrict}
      activeRowId={selectedDistrictId}
      createMutation={(payload) => {
        if (!cityId) return;
        create.mutate({ cityId, ...payload });
      }}
      updateMutation={(payload) => update.mutate(payload)}
      deleteMutation={(id) => remove.mutate({ id })}
      bulkSetActiveMutation={(ids, isActive) =>
        bulkSetActive.mutate({ ids, isActive })
      }
      bulkDeleteMutation={(ids) => bulkDelete.mutate({ ids })}
      importEnabled={!!cityId}
      onImportPreview={handleImportPreview}
      onImportCommit={handleImportCommit}
      isCreatePending={create.isPending}
      isUpdatePending={update.isPending}
    />
  );
}

// ── AreasPane ──────────────────────────────────────────────────────────────────

function AreasPane({ districtId }: { districtId: string | null }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const listOpts = trpc.admin.geo.areas.list.queryOptions(
    { districtId: districtId ?? "" },
    { enabled: !!districtId },
  );
  const { data: rawAreas } = useQuery(listOpts);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listOpts.queryKey });

  const areas: GeoRow[] = (rawAreas ?? []).map((a) => ({
    id: a.id,
    nameEn: a.nameEn,
    nameAr: a.nameAr,
    sortOrder: a.sortOrder,
    isActive: a.isActive,
  }));

  const create = useMutation(
    trpc.admin.geo.areas.create.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const update = useMutation(
    trpc.admin.geo.areas.update.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const remove = useMutation(
    trpc.admin.geo.areas.delete.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const bulkSetActive = useMutation(
    trpc.admin.geo.areas.bulkSetActive.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const bulkDelete = useMutation(
    trpc.admin.geo.areas.bulkDelete.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  const importRows = useMutation(
    trpc.admin.geo.areas.importRows.mutationOptions(),
  );

  async function handleImportPreview(file: ParsedImportFile) {
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
    if (!districtId) throw new Error("No district selected");
    const validRows = args.rowsToCommit.filter((r) => r.status === "valid");
    await importRows.mutateAsync({
      districtId,
      rows: validRows.map((r) => ({
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        sortOrder: r.sortOrder,
      })),
    });
    void invalidate();
    return args.reviewRows.map((r) =>
      r.status === "valid" ? { ...r, status: "done" as const } : r,
    );
  }

  return (
    <GeoPane
      data={areas}
      title={String(t("admin.geo.areas"))}
      addTitle={String(t("admin.geo.addArea"))}
      editTitle={String(t("admin.geo.editArea"))}
      exportFileName="areas.csv"
      parentSelected={!!districtId}
      parentHint={String(t("admin.geo.selectDistrictFirst"))}
      onInvalidate={invalidate}
      createMutation={(payload) => {
        if (!districtId) return;
        create.mutate({ districtId, ...payload });
      }}
      updateMutation={(payload) => update.mutate(payload)}
      deleteMutation={(id) => remove.mutate({ id })}
      bulkSetActiveMutation={(ids, isActive) =>
        bulkSetActive.mutate({ ids, isActive })
      }
      bulkDeleteMutation={(ids) => bulkDelete.mutate({ ids })}
      importEnabled={!!districtId}
      onImportPreview={handleImportPreview}
      onImportCommit={handleImportCommit}
      isCreatePending={create.isPending}
      isUpdatePending={update.isPending}
    />
  );
}

// ── GeoManager — root export ───────────────────────────────────────────────────

export function GeoManager() {
  const { t } = useTranslation();

  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null,
  );

  function handleSelectCity(id: string | null) {
    setSelectedCityId(id);
    setSelectedDistrictId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <EntityPageHeader title={String(t("admin.geo.title"))} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <CitiesPane
              selectedCityId={selectedCityId}
              onSelectCity={handleSelectCity}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <DistrictsPane
              cityId={selectedCityId}
              selectedDistrictId={selectedDistrictId}
              onSelectDistrict={setSelectedDistrictId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <AreasPane districtId={selectedDistrictId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
