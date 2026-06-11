import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  pgEnum,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "../auth/users";
import { CategoriesTable } from "./categories";
import { ItemAliasesTable } from "./item-aliases";

export const itemUnitValues = ["piece", "kg", "gram", "liter", "pack"] as const;
export type ItemUnit = (typeof itemUnitValues)[number];
export const itemUnitEnum = pgEnum("item_unit", itemUnitValues);

export const itemStatusValues = ["approved", "pending_review", "merged"] as const;
export type ItemStatus = (typeof itemStatusValues)[number];
export const itemStatusEnum = pgEnum("item_status", itemStatusValues);

export const itemSourceValues = ["seed", "customer", "admin"] as const;
export type ItemSource = (typeof itemSourceValues)[number];
export const itemSourceEnum = pgEnum("item_source", itemSourceValues);

/**
 * Crowd-sourced catalog items. Bilingual names — customer-added items may have
 * one language until AI/admin fills the other. Normalized columns power exact
 * + pg_trgm fuzzy dedup (docs/05-item-dedup-pipeline.md).
 */
export const ItemsTable = pgTable(
  "items",
  {
    id,
    categoryId: uuid()
      .notNull()
      .references(() => CategoriesTable.id),
    nameEn: varchar({ length: 128 }),
    nameAr: varchar({ length: 128 }),
    normalizedEn: varchar({ length: 128 }),
    normalizedAr: varchar({ length: 128 }),
    imageUrl: varchar({ length: 512 }),
    defaultUnit: itemUnitEnum().notNull().default("piece"),
    status: itemStatusEnum().notNull().default("pending_review"),
    mergedIntoItemId: uuid().references((): AnyPgColumn => ItemsTable.id),
    source: itemSourceEnum().notNull().default("customer"),
    createdByUserId: uuid().references(() => UsersTable.id),
    ...auditColumns,
  },
  (table) => [
    index("items_category_status_idx").on(table.categoryId, table.status),
    index("items_normalized_en_trgm").using(
      "gin",
      sql`${table.normalizedEn} gin_trgm_ops`,
    ),
    index("items_normalized_ar_trgm").using(
      "gin",
      sql`${table.normalizedAr} gin_trgm_ops`,
    ),
  ],
);

export const itemsRelations = relations(ItemsTable, ({ one, many }) => ({
  category: one(CategoriesTable, {
    fields: [ItemsTable.categoryId],
    references: [CategoriesTable.id],
  }),
  mergedInto: one(ItemsTable, {
    fields: [ItemsTable.mergedIntoItemId],
    references: [ItemsTable.id],
    relationName: "merge",
  }),
  aliases: many(ItemAliasesTable),
}));

export type Item = typeof ItemsTable.$inferSelect;
export type NewItem = typeof ItemsTable.$inferInsert;
