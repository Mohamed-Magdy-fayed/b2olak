import "server-only";

import { inArray, sql } from "drizzle-orm";

import type { Db } from "@workspace/db/client";
import { ItemPriceStatsTable } from "@workspace/db/schemas/catalog/item-price-stats";
import { OrderItemsTable } from "@workspace/db/schemas/orders/order-items";

/**
 * Rebuild market-price stats per (item, unit) from real driver price entries.
 * Append-only upsert — always recomputed from source rows, so there are no
 * running sums to drift. Called two ways:
 *   - full sync (admin): no `itemIds` → every item with priced lines
 *   - single item (driver background): `itemIds: [id]` → just that item
 *
 * Only resolved, non-money lines with a real per-unit price count. Money-kind
 * lines ("buy X EGP worth") carry no per-unit price and are excluded.
 * Returns the number of stat rows upserted.
 */
export async function recomputePriceStats(
  db: Db,
  opts: { itemIds?: string[] } = {},
): Promise<number> {
  const itemFilter =
    opts.itemIds && opts.itemIds.length
      ? sql`AND ${inArray(OrderItemsTable.itemId, opts.itemIds)}`
      : sql``;

  const rows = await db.execute(sql`
    INSERT INTO ${ItemPriceStatsTable}
      (item_id, unit, sample_count, avg_price, min_price, max_price, computed_at, created_by)
    SELECT
      ${OrderItemsTable.itemId},
      ${OrderItemsTable.unit},
      count(*)::int,
      round(avg(${OrderItemsTable.actualUnitPrice}), 2),
      min(${OrderItemsTable.actualUnitPrice}),
      max(${OrderItemsTable.actualUnitPrice}),
      now(),
      'system'
    FROM ${OrderItemsTable}
    WHERE ${OrderItemsTable.actualUnitPrice} IS NOT NULL
      AND ${OrderItemsTable.status} IN ('found', 'substituted')
      AND ${OrderItemsTable.unitKind} <> 'money'
      ${itemFilter}
    GROUP BY ${OrderItemsTable.itemId}, ${OrderItemsTable.unit}
    ON CONFLICT (item_id, unit) DO UPDATE SET
      sample_count = EXCLUDED.sample_count,
      avg_price = EXCLUDED.avg_price,
      min_price = EXCLUDED.min_price,
      max_price = EXCLUDED.max_price,
      computed_at = EXCLUDED.computed_at,
      updated_at = now(),
      updated_by = 'system'
    RETURNING id
  `);

  return (rows as unknown as unknown[]).length;
}

/**
 * Distinct item ids that have at least one priced, resolved, non-money line —
 * the working set for a full sync. Batched by the caller for progress.
 */
export async function pricedItemIds(db: Db): Promise<string[]> {
  const rows = await db.execute<{ item_id: string }>(sql`
    SELECT DISTINCT ${OrderItemsTable.itemId} AS item_id
    FROM ${OrderItemsTable}
    WHERE ${OrderItemsTable.actualUnitPrice} IS NOT NULL
      AND ${OrderItemsTable.status} IN ('found', 'substituted')
      AND ${OrderItemsTable.unitKind} <> 'money'
  `);

  return (rows as unknown as { item_id: string }[]).map((r) => r.item_id);
}
