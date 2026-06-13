import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { AreasTable } from "./areas";
import { CitiesTable } from "./cities";

/** Delivery coverage, level 2 — admin-defined, belongs to a city. */
export const DistrictsTable = pgTable(
  "districts",
  {
    id,
    cityId: uuid()
      .notNull()
      .references(() => CitiesTable.id, { onDelete: "cascade" }),
    nameEn: varchar({ length: 128 }).notNull(),
    nameAr: varchar({ length: 128 }).notNull(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...auditColumns,
  },
  (table) => [index("districts_city_idx").on(table.cityId)],
);

export const districtsRelations = relations(DistrictsTable, ({ many, one }) => ({
  city: one(CitiesTable, {
    fields: [DistrictsTable.cityId],
    references: [CitiesTable.id],
  }),
  areas: many(AreasTable),
}));

export type District = typeof DistrictsTable.$inferSelect;
