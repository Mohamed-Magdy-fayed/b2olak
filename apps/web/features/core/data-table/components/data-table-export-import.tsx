"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useTranslation } from "@workspace/i18n/react";

import { downloadCsv, rowsToCsv } from "../lib/csv";

type DataTableExportButtonProps<T> = {
  table: TanstackTable<T>;
  /** Row → plain object for CSV (keys = column ids) */
  getExportRow: (row: T) => Record<string, unknown>;
  exportFileName?: string;
  /**
   * Server-mode hook: when no rows are selected, asked to fetch every row
   * matching the current filters/sorting (no pagination). When omitted the
   * export falls back to `table.getFilteredRowModel().rows` (client mode).
   */
  fetchAllRows?: () => Promise<T[]>;
};

export function DataTableExportButton<T>({
  table,
  getExportRow,
  exportFileName = "export.csv",
  fetchAllRows,
}: DataTableExportButtonProps<T>) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const visibleCols = table
    .getVisibleLeafColumns()
    .filter((c) => c.id !== "select" && c.id !== "actions");
  const headers = visibleCols.map((c) => c.id);

  async function handleExport() {
    setExporting(true);
    try {
      const selected = table.getFilteredSelectedRowModel().rows;
      let rows: T[];

      if (selected.length > 0) {
        // 1. Selected rows always win.
        rows = selected.map((r) => r.original);
      } else if (fetchAllRows) {
        // 2. Server mode — fetch every match (limit enforced server-side).
        rows = await fetchAllRows();
      } else {
        // 3. Client mode — current filter, all pages already in memory.
        rows = table.getFilteredRowModel().rows.map((r) => r.original);
      }

      const csv = rowsToCsv(headers, rows.map(getExportRow));
      downloadCsv(exportFileName, csv);
      toast.success(t("dataTable.exportSuccess", { count: rows.length }));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("dataTable.exportFailed"),
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
            aria-label={t("dataTable.export.export")}
          >
            <DownloadIcon className="size-3.5" />
          </Button>
        }
      />
      <TooltipContent>{t("dataTable.export.export")}</TooltipContent>
    </Tooltip>
  );
}
