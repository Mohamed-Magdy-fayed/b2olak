"use client";

import {
  CheckIcon,
  Loader2Icon,
  RefreshCcwIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
// ButtonGroup does not exist in @workspace/ui — replaced with a flex div of Buttons below.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useTranslation } from "@workspace/i18n/react";
import { cn } from "@workspace/ui/lib/utils";

import { parseCsvToObjects } from "../lib/csv";
import type {
  ImportReviewDialogProps,
  ImportReviewFilter,
  ImportReviewRow,
  ParsedImportFile,
} from "../types";

function defaultCanCommitRow(row: ImportReviewRow) {
  return row.status === "valid";
}

function statusBadgeVariant(status: ImportReviewRow["status"]) {
  switch (status) {
    case "invalid":
      return "destructive" as const;
    case "done":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

export function ImportReviewDialog<TRow extends ImportReviewRow>({
  trigger,
  columns,
  previewFile,
  commitFile,
  canCommitRow = defaultCanCommitRow as (row: TRow) => boolean,
  getRowId,
  onCommitted,
  title,
  description,
}: ImportReviewDialogProps<TRow>) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [parsedFile, setParsedFile] = useState<ParsedImportFile | null>(null);
  const [reviewRows, setReviewRows] = useState<TRow[]>([]);
  const [ignoredColumns, setIgnoredColumns] = useState<string[]>([]);
  const [filter, setFilter] = useState<ImportReviewFilter>("all");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const dialogTitle = title ?? t("dataTable.importReviewTitle");
  const dialogDescription =
    description ?? t("dataTable.importReviewDescription");

  function resetState() {
    setParsedFile(null);
    setReviewRows([]);
    setIgnoredColumns([]);
    setFilter("all");
    setIsPreviewing(false);
    setIsCommitting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = parseCsvToObjects(text);

    if (!parsed || parsed.rows.length === 0) {
      toast.error(t("dataTable.importInvalid"));
      return;
    }

    const nextFile = {
      fileName: file.name,
      headers: parsed.headers,
      rows: parsed.rows,
    } satisfies ParsedImportFile;

    setIsPreviewing(true);

    try {
      const preview = await previewFile(nextFile);
      setParsedFile(nextFile);
      setReviewRows(preview.rows);
      setIgnoredColumns(preview.ignoredColumns ?? []);
      setFilter("all");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("dataTable.importPreviewFailed"),
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCommit() {
    if (!parsedFile) return;

    const rowsToCommit = reviewRows.filter(canCommitRow);

    if (rowsToCommit.length === 0) {
      toast.message(t("dataTable.importNoValidRows"));
      return;
    }

    setIsCommitting(true);

    try {
      const nextRows = await toast
        .promise(
          commitFile({
            file: parsedFile,
            reviewRows,
            rowsToCommit,
          }),
          {
            loading: t("dataTable.importCommitting"),
            success: (rows) =>
              t("dataTable.importCommitSuccess", {
                count: rows.filter((row) => row.status === "done").length,
              }),
            error: (error) =>
              error instanceof Error
                ? error.message
                : t("dataTable.importCommitFailed"),
          },
        )
        .unwrap();

      setReviewRows(nextRows);
      await onCommitted?.();
    } catch {
      // toast.promise already surfaced the failure.
    } finally {
      setIsCommitting(false);
    }
  }

  const filteredRows = useMemo(() => {
    return reviewRows.filter(
      (row) => filter === "all" || row.status === filter,
    );
  }, [filter, reviewRows]);

  const filterCounts = useMemo(
    () => ({
      all: reviewRows.length,
      valid: reviewRows.filter((row) => row.status === "valid").length,
      invalid: reviewRows.filter((row) => row.status === "invalid").length,
      done: reviewRows.filter((row) => row.status === "done").length,
    }),
    [reviewRows],
  );

  const hasReview = reviewRows.length > 0;
  const isBusy = isPreviewing || isCommitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          resetState();
        }
      }}
    >
      <DialogTrigger render={trigger} />

      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void handleFile(file);
          }}
        />

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-4 px-4 py-4">
            <div className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {parsedFile?.fileName ?? t("dataTable.importChooseFileHint")}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("dataTable.importHint")}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={openFilePicker}
                className="self-start md:self-auto"
              >
                {parsedFile ? (
                  <RefreshCcwIcon data-icon="inline-start" />
                ) : (
                  <UploadIcon data-icon="inline-start" />
                )}
                {parsedFile
                  ? t("dataTable.importReplaceFile")
                  : t("dataTable.importChooseFile")}
              </Button>
            </div>

            {ignoredColumns.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("dataTable.importIgnoredColumns")}{" "}
                {ignoredColumns.join(", ")}
              </p>
            ) : null}

            {hasReview ? (
              <>
                {/* ButtonGroup replaced with flex div — @workspace/ui has no ButtonGroup */}
                <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                  <Button
                    type="button"
                    size="sm"
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => setFilter("all")}
                  >
                    {t("dataTable.importFilterAll")} ({filterCounts.all})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={filter === "valid" ? "default" : "outline"}
                    onClick={() => setFilter("valid")}
                  >
                    {t("dataTable.importFilterValid")} ({filterCounts.valid})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={filter === "invalid" ? "default" : "outline"}
                    onClick={() => setFilter("invalid")}
                  >
                    {t("dataTable.importFilterInvalid")} ({filterCounts.invalid}
                    )
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={filter === "done" ? "default" : "outline"}
                    onClick={() => setFilter("done")}
                  >
                    {t("dataTable.importFilterDone")} ({filterCounts.done})
                  </Button>
                </div>

                <ScrollArea className="w-full rounded-md border">
                  <div className="min-w-max">
                    <table className="w-full text-xs">
                      <TableHeader>
                        <TableRow>
                          {columns.map((column) => (
                            <TableHead
                              key={column.id}
                              className={cn(
                                "bg-background",
                                column.headerClassName,
                              )}
                            >
                              {column.header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.length > 0 ? (
                          filteredRows.map((row) => (
                            <TableRow key={getRowId?.(row) ?? row.rowNumber}>
                              {columns.map((column) => (
                                <TableCell
                                  key={column.id}
                                  className={cn(column.cellClassName)}
                                >
                                  {column.cell(row)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length}
                              className="py-8 text-center text-muted-foreground"
                            >
                              {t("dataTable.importNoRowsForFilter")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </table>
                  </div>
                </ScrollArea>
              </>
            ) : isPreviewing ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-4 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                {t("dataTable.importPreviewing")}
              </div>
            ) : parsedFile ? (
              <div className="rounded-md border px-3 py-4 text-sm text-muted-foreground">
                {t("dataTable.importPreviewEmpty")}
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t px-4 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => setOpen(false)}
          >
            <XIcon data-icon="inline-start" />
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={isBusy || !hasReview || filterCounts.valid === 0}
            onClick={() => void handleCommit()}
          >
            {isCommitting ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {t("dataTable.importCommit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ImportReviewStatusBadge({
  status,
}: {
  status: ImportReviewRow["status"];
}) {
  const { t } = useTranslation();

  const label =
    status === "valid"
      ? t("dataTable.importStatusValid")
      : status === "invalid"
        ? t("dataTable.importStatusInvalid")
        : t("dataTable.importStatusDone");

  return <Badge variant={statusBadgeVariant(status)}>{label}</Badge>;
}
