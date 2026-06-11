import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { ItemsTable } from "./items";

export const CategoriesTable = pgTable(
  "categories",
  {
    id,
    nameEn: varchar({ length: 128 }).notNull(),
    nameAr: varchar({ length: 128 }).notNull(),
    slug: varchar({ length: 128 }).notNull(),
    imageUrl: varchar({ length: 512 }),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...auditColumns,
  },
  (table) => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export const categoriesRelations = relations(CategoriesTable, ({ many }) => ({
  items: many(ItemsTable),
}));

export type Category = typeof CategoriesTable.$inferSelect;
