"use client";

import type { ColumnDef, Row } from "@tanstack/react-table";
import type { ReactNode } from "react";

import type { useTranslation } from "@workspace/i18n/react";

type Translate = ReturnType<typeof useTranslation>["t"];

/** Standard pinned actions column (inline-end) for entity tables. */
export function createEntityActionsColumn<T>(opts: {
  t: Translate;
  size?: number;
  cell: (props: { row: Row<T> }) => ReactNode;
}): ColumnDef<T> {
  const { t, size = 56, cell } = opts;

  return {
    id: "actions",
    enablePinning: true,
    enableHiding: false,
    enableSorting: false,
    size,
    meta: { label: String(t("admin.common.actions")) },
    header: () => (
      <span className="block text-xs font-medium text-muted-foreground">
        {String(t("admin.common.actions"))}
      </span>
    ),
    cell: ({ row }) => cell({ row }),
  };
}
