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
import { DistrictsTable } from "./districts";

/** Delivery coverage, level 3 (area/street) — admin-defined, belongs to a district. */
export const AreasTable = pgTable(
  "areas",
  {
    id,
    districtId: uuid()
      .notNull()
      .references(() => DistrictsTable.id, { onDelete: "cascade" }),
    nameEn: varchar({ length: 128 }).notNull(),
    nameAr: varchar({ length: 128 }).notNull(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...auditColumns,
  },
  (table) => [index("areas_district_idx").on(table.districtId)],
);

export const areasRelations = relations(AreasTable, ({ one }) => ({
  district: one(DistrictsTable, {
    fields: [AreasTable.districtId],
    references: [DistrictsTable.id],
  }),
}));

export type Area = typeof AreasTable.$inferSelect;
