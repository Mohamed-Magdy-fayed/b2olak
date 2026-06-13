import {
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { localeEnum } from "../auth/users";

/**
 * Pre-launch app-download waitlist captured on the landing page while the
 * store links are not yet configured.
 */
export const WaitlistSignupsTable = pgTable(
  "waitlist_signups",
  {
    id,
    /** E.164 (+201xxxxxxxxx). */
    phone: varchar({ length: 16 }).notNull(),
    locale: localeEnum().notNull().default("ar"),
    source: varchar({ length: 32 }).notNull().default("landing-download"),
    ...auditColumns,
  },
  (table) => [uniqueIndex("waitlist_signups_phone_unique").on(table.phone)],
);

export type WaitlistSignup = typeof WaitlistSignupsTable.$inferSelect;
export type NewWaitlistSignup = typeof WaitlistSignupsTable.$inferInsert;
