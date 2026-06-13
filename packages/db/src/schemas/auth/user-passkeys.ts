import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "./users";

/**
 * WebAuthn/passkey credentials. Schema lands ahead of UI — helpers live in
 * @workspace/auth/webauthn.
 */
export const UserPasskeysTable = pgTable(
  "user_passkeys",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    /** base64url credential id as issued by the authenticator. */
    credentialId: text().notNull(),
    /** base64url-encoded COSE public key. */
    publicKey: text().notNull(),
    label: text(),
    transports: jsonb().$type<string[]>(),
    signCount: bigint({ mode: "number" }).notNull().default(0),
    aaguid: text(),
    isBackupEligible: boolean().notNull().default(false),
    isBackupState: boolean().notNull().default(false),
    lastUsedAt: timestamp({ withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("user_passkeys_credential_unique").on(table.credentialId),
    index("user_passkeys_user_idx").on(table.userId),
  ],
);

export const userPasskeysRelations = relations(UserPasskeysTable, ({ one }) => ({
  user: one(UsersTable, {
    fields: [UserPasskeysTable.userId],
    references: [UsersTable.id],
  }),
}));

export type UserPasskey = typeof UserPasskeysTable.$inferSelect;
export type NewUserPasskey = typeof UserPasskeysTable.$inferInsert;
