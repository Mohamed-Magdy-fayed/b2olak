import { z } from "zod";

/**
 * Standard wire contract for server-mode data tables (ported from the
 * Funtastic reference): the client sends TanStack state verbatim, the server
 * answers `{ rows, pageCount, total }`.
 */

export const sortingSchema = z
  .array(z.object({ id: z.string(), desc: z.boolean() }))
  .default([]);

export const columnFiltersSchema = z
  .array(z.object({ id: z.string(), value: z.unknown() }))
  .default([]);

export const tableListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: sortingSchema,
  columnFilters: columnFiltersSchema,
  globalFilter: z.string().trim().max(120).optional(),
});

export type TableListInput = z.infer<typeof tableListInputSchema>;

/** Export uses the same filters but no pagination; rows are capped. */
export const tableExportInputSchema = tableListInputSchema.omit({
  page: true,
  perPage: true,
});

export type TableExportInput = z.infer<typeof tableExportInputSchema>;

export const EXPORT_ROW_CAP = 5000;

export type DateRangeFilterValue = { from?: string; to?: string };
export type NumberRangeFilterValue = { min?: number; max?: number };

export function isDateRangeValue(v: unknown): v is DateRangeFilterValue {
  if (v == null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!("from" in o) && !("to" in o)) return false;
  if (o.from != null && typeof o.from !== "string") return false;
  if (o.to != null && typeof o.to !== "string") return false;
  return true;
}

export function isNumberRangeValue(v: unknown): v is NumberRangeFilterValue {
  if (v == null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const ok = (x: unknown) => x === undefined || x === null || typeof x === "number";
  return ok(o.min) && ok(o.max);
}

/** Multi-select facet values arrive as string arrays; narrow against an allowlist. */
export function facetValues<T extends string>(
  v: unknown,
  allowed: readonly T[],
): T[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(String)
    .filter((s): s is T => (allowed as readonly string[]).includes(s));
}

export function dateBounds(v: DateRangeFilterValue): {
  from?: Date;
  to?: Date;
} {
  const out: { from?: Date; to?: Date } = {};
  if (v.from) {
    const d = new Date(v.from);
    if (!Number.isNaN(d.getTime())) out.from = d;
  }
  if (v.to) {
    const d = new Date(v.to);
    if (!Number.isNaN(d.getTime())) out.to = d;
  }
  return out;
}

export function pageMath(total: number, page: number, perPage: number) {
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const clampedPage = Math.min(page, pageCount);
  return { pageCount, offset: (clampedPage - 1) * perPage };
}
