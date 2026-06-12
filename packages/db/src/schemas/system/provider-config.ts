import { pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";

/**
 * Flat key/value store for integration provider config and encrypted credentials.
 * Known keys: whatsapp_provider, whatsapp_wapilot_instance_id,
 *   whatsapp_wapilot_api_token, whatsapp_twilio_account_sid,
 *   whatsapp_twilio_auth_token, whatsapp_twilio_from_number.
 */
export const ProviderConfigTable = pgTable(
  "provider_config",
  {
    id,
    key: varchar({ length: 128 }).notNull(),
    value: text(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("provider_config_key_idx").on(t.key)],
);
