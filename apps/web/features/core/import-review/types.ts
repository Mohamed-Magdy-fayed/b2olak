"use client";

import type { ReactElement, ReactNode } from "react";

export type ImportReviewStatus = "valid" | "invalid" | "done";
export type ImportReviewFilter = "all" | ImportReviewStatus;

export type ParsedImportFile = {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

export type ImportReviewRow = {
  rowNumber: number;
  status: ImportReviewStatus;
  reasons: string[];
};

export type ImportReviewColumn<TRow extends ImportReviewRow> = {
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

export type ImportReviewPreviewResult<TRow extends ImportReviewRow> = {
  ignoredColumns?: string[];
  rows: TRow[];
};

export type ImportReviewDialogProps<TRow extends ImportReviewRow> = {
  trigger: ReactElement;
  columns: ImportReviewColumn<TRow>[];
  previewFile: (
    file: ParsedImportFile,
  ) => Promise<ImportReviewPreviewResult<TRow>>;
  commitFile: (args: {
    file: ParsedImportFile;
    reviewRows: TRow[];
    rowsToCommit: TRow[];
  }) => Promise<TRow[]>;
  canCommitRow?: (row: TRow) => boolean;
  getRowId?: (row: TRow) => string | number;
  onCommitted?: () => Promise<void> | void;
  title?: string;
  description?: string;
};
