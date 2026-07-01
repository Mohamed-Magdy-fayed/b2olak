import { relations } from "drizzle-orm";
import {
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { DriverProfilesTable } from "../drivers/driver-profiles";
import { UserCredentialsTable } from "./user-credentials";
import { UserOAuthAccountsTable } from "./user-oauth-accounts";
import { UserPasskeysTable } from "./user-passkeys";
import { UserTokensTable } from "./user-tokens";

export const userRoleValues = ["admin", "customer", "driver"] as const;
export type UserRole = (typeof userRoleValues)[number];
export const userRoleEnum = pgEnum("user_role", userRoleValues);

export const userStatusValues = ["active", "suspended"] as const;
export type UserStatus = (typeof userStatusValues)[number];
export const userStatusEnum = pgEnum("user_status", userStatusValues);

export const localeValues = ["en", "ar"] as const;
export const localeEnum = pgEnum("locale", localeValues);

export const notificationChannelValues = ["push", "whatsapp"] as const;
export type NotificationChannel = (typeof notificationChannelValues)[number];
export const notificationChannelEnum = pgEnum(
  "notification_channel",
  notificationChannelValues,
);

export const UsersTable = pgTable(
  "users",
  {
    id,
    /** E.164 (+201xxxxxxxxx) — identity for customers and drivers. */
    phone: varchar({ length: 16 }),
    /** Identity for admins; optional for everyone else. */
    email: varchar({ length: 256 }),
    name: varchar({ length: 256 }),
    imageUrl: varchar({ length: 512 }),
    role: userRoleEnum().notNull().default("customer"),
    status: userStatusEnum().notNull().default("active"),
    preferredLocale: localeEnum().notNull().default("ar"),
    pushToken: varchar({ length: 512 }),
    /**
     * Which channel order-status updates go to. `push` = in-app only (saves
     * WhatsApp sends); `whatsapp` = WhatsApp fallback for customers who denied
     * OS notification permission. OTP + admin ops pings are always WhatsApp.
     */
    notificationChannel: notificationChannelEnum().notNull().default("whatsapp"),
    /**
     * Customer wallet credit (EGP). Positive = spendable credit. Denormalized
     * running total of `customer_wallet_entries`; kept in sync in the same
     * transaction as each ledger write.
     */
    walletBalance: numeric({ precision: 10, scale: 2 }).notNull().default("0.00"),
    phoneVerifiedAt: timestamp({ withTimezone: true }),
    emailVerifiedAt: timestamp({ withTimezone: true }),
    lastSignInAt: timestamp({ withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("users_phone_unique").on(table.phone),
    uniqueIndex("users_email_unique").on(table.email),
  ],
);

export const usersRelations = relations(UsersTable, ({ many, one }) => ({
  credentials: one(UserCredentialsTable, {
    fields: [UsersTable.id],
    references: [UserCredentialsTable.userId],
  }),
  tokens: many(UserTokensTable),
  oauthAccounts: many(UserOAuthAccountsTable),
  passkeys: many(UserPasskeysTable),
  driverProfile: one(DriverProfilesTable, {
    fields: [UsersTable.id],
    references: [DriverProfilesTable.userId],
  }),
}));

export type User = typeof UsersTable.$inferSelect;
export type NewUser = typeof UsersTable.$inferInsert;
