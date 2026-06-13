import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, varchar } from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { DistrictsTable } from "./districts";

/** Delivery coverage, level 1 — admin-defined. */
export const CitiesTable = pgTable("cities", {
  id,
  nameEn: varchar({ length: 128 }).notNull(),
  nameAr: varchar({ length: 128 }).notNull(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  ...auditColumns,
});

export const citiesRelations = relations(CitiesTable, ({ many }) => ({
  districts: many(DistrictsTable),
}));

export type City = typeof CitiesTable.$inferSelect;
