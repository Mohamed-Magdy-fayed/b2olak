"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useTranslation } from "@workspace/i18n/react";

import { getPinningClassName } from "../lib/pinning";

type DataTableProps<T> = {
  table: TanstackTable<T>;
  toolbar?: ReactNode;
  footer?: ReactNode;
  actionBar?: ReactNode;
};

export function DataTable<T>({
  table,
  toolbar,
  footer,
  actionBar,
}: DataTableProps<T>) {
  const { t, dir } = useTranslation();
  const rows = table.getRowModel().rows;
  const visible = table.getVisibleLeafColumns().length || 1;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {toolbar}
      <Table dir={dir} className="w-full">
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
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
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
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visible}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("dataTable.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
      </Table>
      {footer}
      {actionBar}
    </div>
  );
}
