import { jsonb, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";

/**
 * Key/value system settings (docs/01-journeys/admin.md A7).
 * Known keys: delivery_fee_egp { amount }, support_whatsapp_number { value }.
 */
export const SystemSettingsTable = pgTable(
  "system_settings",
  {
    id,
    key: varchar({ length: 64 }).notNull(),
    value: jsonb().notNull(),
    description: varchar({ length: 256 }),
    ...auditColumns,
  },
  (table) => [uniqueIndex("system_settings_key_unique").on(table.key)],
);
