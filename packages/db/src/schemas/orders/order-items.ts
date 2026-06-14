import { relations } from "drizzle-orm";
import {
  index,
  numeric,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { ItemsTable } from "../catalog/items";
import { orderItemStatusEnum } from "./enums";
import { OrdersTable } from "./orders";


/**
 * Order lines. Names are SNAPSHOTS (catalog merges/renames never rewrite
 * history). actualUnitPrice is entered by the driver while shopping.
 */
export const OrderItemsTable = pgTable(
  "order_items",
  {
    id,
    orderId: uuid()
      .notNull()
      .references(() => OrdersTable.id, { onDelete: "cascade" }),
    itemId: uuid()
      .notNull()
      .references(() => ItemsTable.id),
    nameSnapshotEn: varchar({ length: 128 }),
    nameSnapshotAr: varchar({ length: 128 }),
    qty: numeric({ precision: 10, scale: 3 }).notNull(),
    /** Snapshot of the unit `code` at order time (catalog edits never rewrite history). */
    unit: varchar({ length: 32 }).notNull(),
    customerNote: text(),
    status: orderItemStatusEnum().notNull().default("pending"),
    actualUnitPrice: numeric({ precision: 10, scale: 2 }),
    actualLineTotal: numeric({ precision: 10, scale: 2 }),
    ...auditColumns,
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

export const orderItemsRelations = relations(OrderItemsTable, ({ one }) => ({
  order: one(OrdersTable, {
    fields: [OrderItemsTable.orderId],
    references: [OrdersTable.id],
  }),
  item: one(ItemsTable, {
    fields: [OrderItemsTable.itemId],
    references: [ItemsTable.id],
  }),
}));

export type OrderItem = typeof OrderItemsTable.$inferSelect;
