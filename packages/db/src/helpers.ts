import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/** Shared column helpers — ported from the reference app. */

export const id = uuid().primaryKey().defaultRandom();

export const createdBy = varchar();
export const createdAt = timestamp({ withTimezone: true })
  .notNull()
  .defaultNow();

export const updatedBy = varchar();
export const updatedAt = timestamp({ withTimezone: true }).$onUpdate(
  () => new Date(),
);

export const deletedBy = varchar();
export const deletedAt = timestamp({ withTimezone: true });

/** Spread into tables: soft delete + audit trail on everything. */
export const auditColumns = {
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  deletedAt,
  deletedBy,
};
