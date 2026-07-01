import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";

export const priceSyncStatusValues = [
  "running",
  "completed",
  "failed",
] as const;
export type PriceSyncStatus = (typeof priceSyncStatusValues)[number];
export const priceSyncStatusEnum = pgEnum(
  "price_sync_status",
  priceSyncStatusValues,
);

/**
 * Progress tracker for an admin-triggered full price recompute. The background
 * Inngest job bumps `processedItems`/`statsUpserted` per batch; the admin UI
 * polls the latest row to drive a progress bar.
 */
export const PriceSyncRunsTable = pgTable("price_sync_runs", {
  id,
  status: priceSyncStatusEnum().notNull().default("running"),
  totalItems: integer().notNull().default(0),
  processedItems: integer().notNull().default(0),
  statsUpserted: integer().notNull().default(0),
  error: text(),
  startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp({ withTimezone: true }),
  ...auditColumns,
});

export type PriceSyncRun = typeof PriceSyncRunsTable.$inferSelect;
