"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { useTranslation } from "@workspace/i18n/react";
import { cn } from "@workspace/ui/lib/utils";

type DataTableActionBarProps<TData> = {
  table: TanstackTable<TData>;
  children?: ReactNode;
  className?: string;
};

export function DataTableActionBar<TData>({
  table,
  children,
  className,
}: DataTableActionBarProps<TData>) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        table.resetRowSelection();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [table]);

  const container = mounted ? globalThis.document?.body : null;
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const visible = selectedCount > 0;

  if (!container || !visible) return null;

  return createPortal(
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-md border border-border bg-background p-1 text-foreground shadow-2xl",
        className,
      )}
    >
      <div className="flex h-7 items-center rounded-sm bg-muted px-2 text-xs font-medium text-foreground">
        {t("dataTable.selected", { count: selectedCount })}
      </div>
      {children ? (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-5" />
          <div className="flex items-center gap-1">{children}</div>
        </>
      ) : null}
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label={String(t("dataTable.clearSelection"))}
        onClick={() => table.resetRowSelection()}
      >
        <XIcon className="size-3.5" />
      </Button>
    </div>,
    container,
  );
}
