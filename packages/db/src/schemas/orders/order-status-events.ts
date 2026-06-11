import { relations } from "drizzle-orm";
import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "../auth/users";
import { actorRoleEnum, orderStatusEnum } from "./enums";
import { OrdersTable } from "./orders";


/**
 * Immutable order timeline — one row per transition, written in the SAME
 * transaction as the status change (docs/03-data-model.md §3).
 */
export const OrderStatusEventsTable = pgTable(
  "order_status_events",
  {
    id,
    orderId: uuid()
      .notNull()
      .references(() => OrdersTable.id, { onDelete: "cascade" }),
    fromStatus: orderStatusEnum(),
    toStatus: orderStatusEnum().notNull(),
    actorUserId: uuid().references(() => UsersTable.id),
    actorRole: actorRoleEnum().notNull(),
    note: text(),
    ...auditColumns,
  },
  (table) => [index("order_status_events_order_idx").on(table.orderId, table.createdAt)],
);

export const orderStatusEventsRelations = relations(
  OrderStatusEventsTable,
  ({ one }) => ({
    order: one(OrdersTable, {
      fields: [OrderStatusEventsTable.orderId],
      references: [OrdersTable.id],
    }),
  }),
);
