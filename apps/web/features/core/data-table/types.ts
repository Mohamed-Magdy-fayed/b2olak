import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: mirrors TanStack's ColumnMeta generic parameters
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Header / column picker label */
    label?: string;
    filterVariant?:
      | "text"
      | "number"
      | "numberRange"
      | "select"
      | "multiSelect"
      | "dateRange";
    /** Facet / select options */
    options?: { label: string; value: string }[];
  }
}

export type DataTableMode = "client" | "server";
