import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "../auth/users";
import { cancelledByEnum, orderStatusEnum } from "./enums";
import { OrderItemsTable } from "./order-items";
import { OrderStatusEventsTable } from "./order-status-events";


/**
 * Orders. Address fields are SNAPSHOTS taken at placement — edits to the
 * address book never mutate order history (docs/03-data-model.md).
 * Money is numeric(10,2); totals are always recomputed server-side.
 */
export const OrdersTable = pgTable(
  "orders",
  {
    id,
    orderNumber: integer().notNull().generatedAlwaysAsIdentity(),
    customerId: uuid()
      .notNull()
      .references(() => UsersTable.id),
    driverId: uuid().references(() => UsersTable.id),
    status: orderStatusEnum().notNull().default("placed"),

    // address snapshot
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

    deliveryFee: numeric({ precision: 10, scale: 2 }).notNull(),
    actualItemsTotal: numeric({ precision: 10, scale: 2 }),
    codTotal: numeric({ precision: 10, scale: 2 }),
    amountCollected: numeric({ precision: 10, scale: 2 }),
    customerNote: text(),
    cancelledBy: cancelledByEnum(),
    cancelReason: text(),
    assignedAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index("orders_status_created_idx").on(table.status, table.createdAt),
    index("orders_driver_status_idx").on(table.driverId, table.status),
    index("orders_customer_created_idx").on(table.customerId, table.createdAt),
  ],
);

export const ordersRelations = relations(OrdersTable, ({ one, many }) => ({
  customer: one(UsersTable, {
    fields: [OrdersTable.customerId],
    references: [UsersTable.id],
    relationName: "customerOrders",
  }),
  driver: one(UsersTable, {
    fields: [OrdersTable.driverId],
    references: [UsersTable.id],
    relationName: "driverOrders",
  }),
  items: many(OrderItemsTable),
  statusEvents: many(OrderStatusEventsTable),
}));

export type Order = typeof OrdersTable.$inferSelect;
