import { relations, sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { ItemsTable } from "./items";

export const aliasLocaleValues = ["en", "ar", "unknown"] as const;
export const aliasLocaleEnum = pgEnum("alias_locale", aliasLocaleValues);

/** Alternate spellings pointing at a canonical item ("sugr" → Sugar). */
export const ItemAliasesTable = pgTable(
  "item_aliases",
  {
    id,
    itemId: uuid()
      .notNull()
      .references(() => ItemsTable.id, { onDelete: "cascade" }),
    alias: varchar({ length: 128 }).notNull(),
    normalizedAlias: varchar({ length: 128 }).notNull(),
    locale: aliasLocaleEnum().notNull().default("unknown"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("item_aliases_normalized_unique").on(table.normalizedAlias),
    index("item_aliases_normalized_trgm").using(
      "gin",
      sql`${table.normalizedAlias} gin_trgm_ops`,
    ),
  ],
);

export const itemAliasesRelations = relations(ItemAliasesTable, ({ one }) => ({
  item: one(ItemsTable, {
    fields: [ItemAliasesTable.itemId],
    references: [ItemsTable.id],
  }),
}));
