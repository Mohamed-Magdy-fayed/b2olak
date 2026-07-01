import { relations } from "drizzle-orm";
import { index, numeric, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "../auth/users";
import { OrdersTable } from "../orders/orders";

export const driverLedgerReasonValues = [
  "shortfall",
  "settlement",
  "adjustment",
] as const;
export type DriverLedgerReason = (typeof driverLedgerReasonValues)[number];
export const driverLedgerReasonEnum = pgEnum(
  "driver_ledger_reason",
  driverLedgerReasonValues,
);

/**
 * Append-only driver balance ledger — the source of truth for what a driver
 * owes the company. `amount` is SIGNED: negative = a debit the driver owes
 * (collected less than COD), positive = a credit toward zero (cash handed over
 * at settlement). The denormalized running total lives on
 * `driver_profiles.balance`; a NEGATIVE balance means the driver owes money.
 */
export const DriverLedgerEntriesTable = pgTable(
  "driver_ledger_entries",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    orderId: uuid().references(() => OrdersTable.id, { onDelete: "set null" }),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    reason: driverLedgerReasonEnum().notNull(),
    note: text(),
    ...auditColumns,
  },
  (table) => [
    index("driver_ledger_entries_user_idx").on(table.userId, table.createdAt),
  ],
);

export const driverLedgerEntriesRelations = relations(
  DriverLedgerEntriesTable,
  ({ one }) => ({
    user: one(UsersTable, {
      fields: [DriverLedgerEntriesTable.userId],
      references: [UsersTable.id],
    }),
    order: one(OrdersTable, {
      fields: [DriverLedgerEntriesTable.orderId],
      references: [OrdersTable.id],
    }),
  }),
);

export type DriverLedgerEntry = typeof DriverLedgerEntriesTable.$inferSelect;
