import { relations } from "drizzle-orm";
import { index, numeric, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "../auth/users";
import { OrdersTable } from "../orders/orders";

export const customerWalletReasonValues = [
  "overpayment",
  "redemption",
  "refund",
  "adjustment",
] as const;
export type CustomerWalletReason = (typeof customerWalletReasonValues)[number];
export const customerWalletReasonEnum = pgEnum(
  "customer_wallet_reason",
  customerWalletReasonValues,
);

/**
 * Append-only customer wallet ledger — the source of truth for a customer's
 * credit. `amount` is SIGNED: positive = credit added (overpayment/refund),
 * negative = credit consumed (redemption). The denormalized running total lives
 * on `users.walletBalance`, updated in the same transaction as each entry.
 */
export const CustomerWalletEntriesTable = pgTable(
  "customer_wallet_entries",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    orderId: uuid().references(() => OrdersTable.id, { onDelete: "set null" }),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    reason: customerWalletReasonEnum().notNull(),
    note: text(),
    ...auditColumns,
  },
  (table) => [
    index("customer_wallet_entries_user_idx").on(table.userId, table.createdAt),
  ],
);

export const customerWalletEntriesRelations = relations(
  CustomerWalletEntriesTable,
  ({ one }) => ({
    user: one(UsersTable, {
      fields: [CustomerWalletEntriesTable.userId],
      references: [UsersTable.id],
    }),
    order: one(OrdersTable, {
      fields: [CustomerWalletEntriesTable.orderId],
      references: [OrdersTable.id],
    }),
  }),
);

export type CustomerWalletEntry = typeof CustomerWalletEntriesTable.$inferSelect;
