import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "./users";

export const userTokenTypeValues = [
  "whatsapp_otp",
  "password_reset",
  "email_verify",
] as const;
export type UserTokenType = (typeof userTokenTypeValues)[number];
export const userTokenTypeEnum = pgEnum("user_token_type", userTokenTypeValues);

/**
 * One-time tokens. The token itself is never stored — only its sha256 hash.
 * OTPs: 6 digits, 10-minute expiry, max 5 attempts (docs/06-security.md).
 */
export const UserTokensTable = pgTable(
  "user_tokens",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    type: userTokenTypeEnum().notNull(),
    hashedToken: varchar({ length: 128 }).notNull(),
    attempts: integer().notNull().default(0),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    consumedAt: timestamp({ withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index("user_tokens_user_type_idx").on(table.userId, table.type),
    index("user_tokens_expires_idx").on(table.expiresAt),
  ],
);

export const userTokensRelations = relations(UserTokensTable, ({ one }) => ({
  user: one(UsersTable, {
    fields: [UserTokensTable.userId],
    references: [UsersTable.id],
  }),
}));
