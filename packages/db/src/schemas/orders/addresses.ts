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

export const AddressesTable = pgTable(
  "addresses",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    label: varchar({ length: 64 }),
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
}));

export type Address = typeof AddressesTable.$inferSelect;
