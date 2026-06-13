/** Stored in TanStack column filter state (serializable). */
export type DataTableDateRangeValue = {
  from?: string;
  to?: string;
};

export type DataTableNumberRangeValue = {
  min?: number;
  max?: number;
};

export function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDateStart(ymd: string): Date {
  const parts = ymd.split("-").map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function parseLocalDateEnd(ymd: string): Date {
  const parts = ymd.split("-").map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
}

export function isDateRangeValue(v: unknown): v is DataTableDateRangeValue {
  if (v == null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!("from" in o) && !("to" in o)) return false;
  if (o.from != null && typeof o.from !== "string") return false;
  if (o.to != null && typeof o.to !== "string") return false;
  return true;
}

export function isNumberRangeValue(v: unknown): v is DataTableNumberRangeValue {
  if (v == null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const ok = (x: unknown) => x === undefined || typeof x === "number";
  return ok(o.min) && ok(o.max);
}

/**
 * Convert a `{from, to}` YMD range into UTC ISO datetime instants using the
 * **caller's local timezone** for the day boundaries.
 *
 * Use this on the client right before sending filters to the server so the
 * comparison is anchored to the user's day rather than the server's (which
 * is almost always UTC). The server can then `new Date(s)` directly.
 */
export function dateRangeToWireBounds(
  value: DataTableDateRangeValue,
): DataTableDateRangeValue {
  const out: DataTableDateRangeValue = {};
  const f = value.from?.trim();
  const tt = value.to?.trim();
  if (f) out.from = parseLocalDateStart(f).toISOString();
  if (tt) out.to = parseLocalDateEnd(tt).toISOString();
  return out;
}

/**
 * Walk the table's column filter state and replace any `{from, to}` YMD
 * values with their `dateRangeToWireBounds` UTC counterparts so the server
 * receives unambiguous timestamps.
 */
export function serializeColumnFiltersForServer<
  F extends { id: string; value: unknown },
>(filters: F[]): F[] {
  return filters.map((f) => {
    if (isDateRangeValue(f.value)) {
      return { ...f, value: dateRangeToWireBounds(f.value) };
    }
    return f;
  });
}

/** Day-only comparison: row timestamp must fall within [from, to] local-midnight bounds. */
export function rowTimestampInYmdRange(
  value: Date | string | null | undefined,
  range: DataTableDateRangeValue,
): boolean {
  if (!range.from && !range.to) return true;
  if (value == null) return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  if (range.from) {
    const start = parseLocalDateStart(range.from).getTime();
    if (t < start) return false;
  }
  if (range.to) {
    const end = parseLocalDateEnd(range.to).getTime();
    if (t > end) return false;
  }
  return true;
}
