import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "./users";

export const UserDevicesTable = pgTable(
  "user_devices",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    /** Random UUID generated server-side; the client stores this as its identity. */
    deviceId: text().notNull(),
    /** sha256 hex of the device secret. Secret is returned once at registration. */
    secretHash: text().notNull(),
    label: text(),
    lastUsedAt: timestamp({ withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("user_devices_device_unique").on(table.deviceId),
    index("user_devices_user_idx").on(table.userId),
  ],
);

export const userDevicesRelations = relations(UserDevicesTable, ({ one }) => ({
  user: one(UsersTable, {
    fields: [UserDevicesTable.userId],
    references: [UsersTable.id],
  }),
}));

export type UserDevice = typeof UserDevicesTable.$inferSelect;
export type NewUserDevice = typeof UserDevicesTable.$inferInsert;
