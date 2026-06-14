import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { ItemsTable } from "./items";
import { UnitsTable } from "./units";

/**
 * Many-to-many link of the units an item can be ordered in (milk → liter,
 * bottle). Exactly one row per item carries `isDefault` — enforced by the
 * partial unique index — and is preselected when ordering.
 */
export const ItemUnitsTable = pgTable(
  "item_units",
  {
    id,
    itemId: uuid()
      .notNull()
      .references(() => ItemsTable.id, { onDelete: "cascade" }),
    unitId: uuid()
      .notNull()
      .references(() => UnitsTable.id),
    isDefault: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("item_units_item_unit_unique").on(table.itemId, table.unitId),
    uniqueIndex("item_units_one_default")
      .on(table.itemId)
      .where(sql`${table.isDefault}`),
  ],
);

export const itemUnitsRelations = relations(ItemUnitsTable, ({ one }) => ({
  item: one(ItemsTable, {
    fields: [ItemUnitsTable.itemId],
    references: [ItemsTable.id],
  }),
  unit: one(UnitsTable, {
    fields: [ItemUnitsTable.unitId],
    references: [UnitsTable.id],
  }),
}));

export type ItemUnit = typeof ItemUnitsTable.$inferSelect;
export type NewItemUnit = typeof ItemUnitsTable.$inferInsert;
