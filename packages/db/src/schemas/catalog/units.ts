import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { ItemUnitsTable } from "./item-units";

/**
 * Managed catalog of units of measure (KG, piece, bottle, carton…). Replaces
 * the old fixed `item_unit` enum as the single source of truth. `code` is the
 * stable slug snapshotted onto order lines — never reused once orders exist.
 */
export const UnitsTable = pgTable(
  "units",
  {
    id,
    code: varchar({ length: 32 }).notNull(),
    nameEn: varchar({ length: 64 }).notNull(),
    nameAr: varchar({ length: 64 }).notNull(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...auditColumns,
  },
  (table) => [uniqueIndex("units_code_unique").on(table.code)],
);

export const unitsRelations = relations(UnitsTable, ({ many }) => ({
  itemUnits: many(ItemUnitsTable),
}));

export type Unit = typeof UnitsTable.$inferSelect;
export type NewUnit = typeof UnitsTable.$inferInsert;
