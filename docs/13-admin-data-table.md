# Admin Data-Table Pattern

Every admin list view uses a shared `DataTable` suite (TanStack Table v8 + shadcn/ui
primitives) wired to a standard tRPC list contract. This doc is the copy-paste guide for
new tables.

---

## Wire contract

**Location:** `packages/api/src/lib/table-query.ts`

### Input (`tableListInputSchema`)

```ts
{
  page:          number  // 1-indexed, min 1, default 1
  perPage:       number  // 1–100, default 20
  sorting:       { id: string; desc: boolean }[]   // TanStack SortingState verbatim
  columnFilters: { id: string; value: unknown }[]  // TanStack ColumnFiltersState verbatim
  globalFilter?: string  // max 120 chars, trimmed
}
```

Use the schema directly in your router — no need to re-declare it:

```ts
import { tableListInputSchema, pageMath } from "../../lib/table-query";

list: adminProcedure
  .input(tableListInputSchema)
  .query(async ({ ctx, input }) => {
    const where = buildWhere(input);
    const [{ value: total }] = await ctx.db
      .select({ value: count() })
      .from(MyTable)
      .where(where);
    const { pageCount, offset } = pageMath(total, input.page, input.perPage);
    const rows = await ctx.db.query.MyTable.findMany({
      where,
      orderBy: buildOrderBy(input.sorting),
      offset,
      limit: input.perPage,
    });
    return { rows, pageCount, total };
  }),
```

### Output

```ts
{ rows: T[]; pageCount: number; total: number }
```

### Helpers in `table-query.ts`

| Helper | Purpose |
|--------|---------|
| `pageMath(total, page, perPage)` | Returns `{ pageCount, offset }` |
| `facetValues(v, allowed)` | Narrows a `columnFilters` value to a typed enum array |
| `isDateRangeValue(v)` | Type guard for `{ from?, to? }` date-range filter values |
| `isNumberRangeValue(v)` | Type guard for `{ min?, max? }` numeric filter values |
| `dateBounds(v)` | Parses a `DateRangeFilterValue` → `{ from?: Date; to?: Date }` |

There is also `tableExportInputSchema` (same shape without `page`/`perPage`, capped at
`EXPORT_ROW_CAP = 5000`) for the matching `.exportRows` procedure.

---

## Component suite

**Location:** `apps/web/features/core/data-table/` — import everything from the barrel:

```ts
import {
  DataTable,
  DataTableActionBar,
  DataTableColumnHeader,
  DataTableDateRangeFilter,
  DataTableExportButton,
  DataTableFacetedFilter,
  DataTableNumberRangeFilter,
  DataTablePagination,
  DataTableSliderFilter,
  DataTableTextFilter,
  DataTableToolbar,
  DataTableViewOptions,
  EntityPageHeader,
  createEntityActionsColumn,
  createExpandColumn,
  createSelectColumn,
  downloadCsv,
  getEntityColumnPinning,
  rowsToCsv,
  serializeColumnFiltersForServer,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
```

### Key hooks

#### `useTableUrlState(defaults?)`

Persists pagination, sorting, filters, and global search in URL query params
(`?page=`, `?perPage=`, `?sort=`, `?filters=`, `?q=`). Debounced 250 ms — no history
pollution. Hydrates from URL on mount.

```ts
const {
  pagination, sorting, columnFilters, globalFilter,
  setPagination, setSorting, setColumnFilters, setGlobalFilter,
} = useTableUrlState({ page: 1, perPage: 20 });
```

#### `useDataTable(args)`

Wraps `useReactTable`. Pass `mode: "server"` for admin tables so TanStack delegates
pagination/sorting/filtering to the server.

```ts
const { table } = useDataTable({
  mode: "server",
  data: data?.rows ?? [],
  pageCount: data?.pageCount ?? 1,
  rowCount: data?.total ?? 0,
  columns,
  getRowId: (row) => row.id,
  controlled,         // pass the DataTableControlledState from useTableUrlState
});
```

`controlled` wires the URL state into the table — sorting/filter changes automatically
reset to page 1.

### Filter components (use inside `DataTableToolbar`)

| Component | Filter value type | Use for |
|-----------|------------------|---------|
| `DataTableTextFilter` | `string` | Free-text per-column search |
| `DataTableFacetedFilter` | `string[]` | Multi-select enum (status, locale, …) |
| `DataTableDateRangeFilter` | `{ from?, to? }` | Date range picker |
| `DataTableNumberRangeFilter` | `{ min?, max? }` | Numeric range (amounts, counts) |
| `DataTableSliderFilter` | `number` | Single numeric threshold |

### Column helpers

| Helper | Purpose |
|--------|---------|
| `createSelectColumn()` | Checkbox column for row selection / bulk actions |
| `createEntityActionsColumn(actions)` | Kebab-menu actions column |
| `createExpandColumn()` | Expand/collapse for tree tables |
| `DataTableColumnHeader` | Sortable header cell (click to toggle asc/desc) |

---

## Step-by-step: adding a new admin table

### 1 — Add the tRPC procedures

In `packages/api/src/routers/admin/<domain>.ts`:

```ts
import {
  tableListInputSchema,
  tableExportInputSchema,
  pageMath,
  EXPORT_ROW_CAP,
} from "../../lib/table-query";

list: adminProcedure
  .input(tableListInputSchema)
  .query(async ({ ctx, input }) => { /* see contract above */ }),

exportRows: adminProcedure
  .input(tableExportInputSchema)
  .query(async ({ ctx, input }) => {
    const where = buildWhere(input);
    const rows = await ctx.db.query.MyTable.findMany({
      where,
      orderBy: buildOrderBy(input.sorting),
      limit: EXPORT_ROW_CAP,
    });
    return { rows };
  }),
```

Mount the router in `packages/api/src/routers/admin/index.ts` and expose it from
`packages/api/src/root.ts` if it's a new sub-router.

### 2 — Define columns

Create `apps/web/features/admin/<domain>-columns.tsx`:

```tsx
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader, createSelectColumn, createEntityActionsColumn } from "@/features/core/data-table";

export type MyRow = { id: string; name: string; /* … */ };

export function buildMyColumns(/* callbacks */): ColumnDef<MyRow>[] {
  return [
    createSelectColumn<MyRow>(),
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    },
    // …
    createEntityActionsColumn<MyRow>([
      { label: "Edit", onClick: (row) => onEdit(row) },
      { label: "Delete", onClick: (row) => onDelete(row) },
    ]),
  ];
}
```

### 3 — Build the table component

Create `apps/web/features/admin/<domain>-table.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  DataTable, DataTablePagination, DataTableToolbar, DataTableViewOptions,
  DataTableFacetedFilter, EntityPageHeader,
  serializeColumnFiltersForServer,
  useDataTable, useTableUrlState,
  type DataTableControlledState,
} from "@/features/core/data-table";
import { useTRPC } from "@/lib/trpc/client";
import { buildMyColumns, type MyRow } from "./my-columns";

export function MyTable() {
  const trpc = useTRPC();

  const {
    pagination, sorting, columnFilters, globalFilter,
    setPagination, setSorting, setColumnFilters, setGlobalFilter,
  } = useTableUrlState({ page: 1, perPage: 20 });

  const controlled: DataTableControlledState = {
    pagination, onPaginationChange: setPagination,
    sorting, onSortingChange: setSorting,
    columnFilters, onColumnFiltersChange: setColumnFilters,
    globalFilter, onGlobalFilterChange: setGlobalFilter,
    rowSelection: {}, onRowSelectionChange: () => {},
    columnVisibility: {}, onColumnVisibilityChange: () => {},
    columnPinning: {}, onColumnPinningChange: () => {},
  };

  const listInput = useMemo(() => ({
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
    sorting,
    columnFilters: serializeColumnFiltersForServer(columnFilters),
    globalFilter: globalFilter || undefined,
  }), [pagination, sorting, columnFilters, globalFilter]);

  const { data, isFetching } = useQuery(
    trpc.admin.myDomain.list.queryOptions(listInput),
  );

  const columns = useMemo(() => buildMyColumns(), []);

  const { table } = useDataTable({
    mode: "server",
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    rowCount: data?.total ?? 0,
    columns,
    getRowId: (row) => row.id,
    controlled,
  });

  return (
    <>
      <EntityPageHeader title="My Things" />
      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar table={table} isFetching={isFetching}>
            <DataTableFacetedFilter
              column={table.getColumn("status")}
              title="Status"
              options={[{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]}
            />
            <DataTableViewOptions table={table} />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
      />
    </>
  );
}
```

### 4 — Wire the page

In `apps/web/app/admin/<domain>/page.tsx`:

```tsx
import { MyTable } from "@/features/admin/my-table";

export default function AdminMyPage() {
  return <MyTable />;
}
```

Add the page to the admin sidebar nav in `apps/web/features/core/admin-nav.tsx` (or
wherever the nav items are defined).

### 5 — Gate

```
npm run typecheck
npm run build
```

---

## Reference implementation

**Orders table** is the canonical example. Read it in full when in doubt:

- Router: `packages/api/src/routers/admin/orders.ts` — `list`, `exportRows`, `assign`, `cancel`
- Columns: `apps/web/features/admin/orders-columns.tsx`
- Table component: `apps/web/features/admin/orders-table.tsx`
- Page: `apps/web/app/admin/orders/page.tsx`

The orders table demonstrates: status facet filter, date-range filter, numeric filter,
global search, column visibility, bulk row selection, per-row action bar (assign/cancel
dialogs), CSV export, and 10-second auto-refresh (`refetchInterval: 10_000`).

---

## Decision log

| Question | Decision |
|----------|----------|
| URL state vs. local state | **URL state** via `useTableUrlState` — deep links + back-button work |
| Reference table | **Orders** — most complete: every filter type + bulk actions + export |
| Filter types in scope | Text, faceted enum, date range, numeric range |
| Export cap | 5 000 rows (`EXPORT_ROW_CAP` in `table-query.ts`) |
| Pagination 1-indexed (API) vs. 0-indexed (TanStack) | API is 1-indexed; `useTableUrlState` bridges (`pageIndex + 1` → server) |
