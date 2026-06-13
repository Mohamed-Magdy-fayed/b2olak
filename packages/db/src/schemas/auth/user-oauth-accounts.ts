import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "./users";

export const oAuthProviderValues = ["google"] as const;
export type OAuthProvider = (typeof oAuthProviderValues)[number];
export const oAuthProviderEnum = pgEnum("oauth_provider", oAuthProviderValues);

/**
 * Third-party identities linked to a user. A provider account can belong to
 * exactly one user; a user may link several providers.
 */
export const UserOAuthAccountsTable = pgTable(
  "user_oauth_accounts",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    provider: oAuthProviderEnum().notNull(),
    providerAccountId: varchar({ length: 256 }).notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("user_oauth_accounts_provider_account_unique").on(
      table.provider,
      table.providerAccountId,
    ),
    index("user_oauth_accounts_user_idx").on(table.userId),
  ],
);

export const userOAuthAccountsRelations = relations(
  UserOAuthAccountsTable,
  ({ one }) => ({
    user: one(UsersTable, {
      fields: [UserOAuthAccountsTable.userId],
      references: [UsersTable.id],
    }),
  }),
);

export type UserOAuthAccount = typeof UserOAuthAccountsTable.$inferSelect;
export type NewUserOAuthAccount = typeof UserOAuthAccountsTable.$inferInsert;
