"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRightIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Expand/collapse toggle column for tree tables (sub-rows). Renders a chevron
 * only when the row can expand; indents by `row.depth` so nested levels read as
 * a hierarchy. Pair with `useDataTable({ getSubRows })`.
 */
export function createExpandColumn<T>(): ColumnDef<T> {
  return {
    id: "expand",
    size: 44,
    enablePinning: true,
    enableHiding: false,
    enableSorting: false,
    header: () => null,
    cell: ({ row }) => {
      const indent = row.depth * 16;
      if (!row.getCanExpand()) {
        return <span style={{ paddingInlineStart: indent }} aria-hidden />;
      }
      const expanded = row.getIsExpanded();
      return (
        <span
          style={{ paddingInlineStart: indent }}
          className="flex items-center"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            aria-expanded={expanded}
            onClick={(event) => {
              event.stopPropagation();
              row.toggleExpanded();
            }}
          >
            <ChevronRightIcon
              className={cn(
                "size-4 transition-transform rtl:-scale-x-100",
                expanded && "rotate-90",
              )}
            />
          </Button>
        </span>
      );
    },
  };
}
