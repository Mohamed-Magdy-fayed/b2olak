import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { ItemsTable } from "./items";

/**
 * Denormalized market-price estimate per (item, unit), derived from real driver
 * price entries on delivered/shopped orders. Rebuilt by the pricing recompute
 * helper — full-sync (admin) or single-item (driver background). `unit` is the
 * snapshot unit CODE, matching `order_items.unit`; money-kind lines are excluded
 * (they carry no per-unit price). Powers the "~X EGP" customer hint and the
 * driver's sanity-check average.
 */
export const ItemPriceStatsTable = pgTable(
  "item_price_stats",
  {
    id,
    itemId: uuid()
      .notNull()
      .references(() => ItemsTable.id, { onDelete: "cascade" }),
    unit: varchar({ length: 32 }).notNull(),
    sampleCount: integer().notNull().default(0),
    avgPrice: numeric({ precision: 10, scale: 2 }),
    minPrice: numeric({ precision: 10, scale: 2 }),
    maxPrice: numeric({ precision: 10, scale: 2 }),
    computedAt: timestamp({ withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("item_price_stats_item_unit_unique").on(
      table.itemId,
      table.unit,
    ),
    index("item_price_stats_item_idx").on(table.itemId),
  ],
);

export const itemPriceStatsRelations = relations(
  ItemPriceStatsTable,
  ({ one }) => ({
    item: one(ItemsTable, {
      fields: [ItemPriceStatsTable.itemId],
      references: [ItemsTable.id],
    }),
  }),
);

export type ItemPriceStat = typeof ItemPriceStatsTable.$inferSelect;
