import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "../auth/users";
import { AreasTable } from "../geo/areas";
import { CitiesTable } from "../geo/cities";
import { DistrictsTable } from "../geo/districts";

export const AddressesTable = pgTable(
  "addresses",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    label: varchar({ length: 64 }),
    /**
     * Structured geo selection (admin-defined coverage). Nullable for legacy
     * free-text rows; new addresses always carry the full chain. The text
     * columns below are localized name snapshots resolved at write time.
     */
    cityId: uuid().references(() => CitiesTable.id, { onDelete: "set null" }),
    districtId: uuid().references(() => DistrictsTable.id, {
      onDelete: "set null",
    }),
    areaId: uuid().references(() => AreasTable.id, { onDelete: "set null" }),
    city: varchar({ length: 128 }).notNull(),
    area: varchar({ length: 128 }).notNull(),
    street: varchar({ length: 256 }).notNull(),
    building: varchar({ length: 64 }),
    floor: varchar({ length: 32 }),
    apartment: varchar({ length: 32 }),
    landmark: varchar({ length: 256 }),
    contactPhone: varchar({ length: 16 }).notNull(),
    lat: numeric({ precision: 10, scale: 7 }),
    lng: numeric({ precision: 10, scale: 7 }),
    isDefault: boolean().notNull().default(false),
    ...auditColumns,
  },
  (table) => [index("addresses_user_idx").on(table.userId)],
);

export const addressesRelations = relations(AddressesTable, ({ one }) => ({
  user: one(UsersTable, {
    fields: [AddressesTable.userId],
    references: [UsersTable.id],
  }),
  cityRef: one(CitiesTable, {
    fields: [AddressesTable.cityId],
    references: [CitiesTable.id],
  }),
  districtRef: one(DistrictsTable, {
    fields: [AddressesTable.districtId],
    references: [DistrictsTable.id],
  }),
  areaRef: one(AreasTable, {
    fields: [AddressesTable.areaId],
    references: [AreasTable.id],
  }),
}));

export type Address = typeof AddressesTable.$inferSelect;
