import { relations } from "drizzle-orm";
import { pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "./users";

/** scrypt password hash + salt. Admin (web) accounts only — customers/drivers use OTP. */
export const UserCredentialsTable = pgTable(
  "user_credentials",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    passwordHash: varchar({ length: 512 }).notNull(),
    salt: varchar({ length: 64 }).notNull(),
    ...auditColumns,
  },
  (table) => [uniqueIndex("user_credentials_user_unique").on(table.userId)],
);

export const userCredentialsRelations = relations(
  UserCredentialsTable,
  ({ one }) => ({
    user: one(UsersTable, {
      fields: [UserCredentialsTable.userId],
      references: [UsersTable.id],
    }),
  }),
);
