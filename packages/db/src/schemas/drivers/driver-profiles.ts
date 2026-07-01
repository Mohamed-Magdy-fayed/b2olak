import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, id } from "../../helpers";
import { UsersTable } from "../auth/users";

export const driverStatusValues = ["pending", "approved", "suspended"] as const;
export type DriverStatus = (typeof driverStatusValues)[number];
export const driverStatusEnum = pgEnum("driver_status", driverStatusValues);

export const vehicleTypeValues = [
  "motorcycle",
  "bicycle",
  "car",
  "on_foot",
] as const;
export type VehicleType = (typeof vehicleTypeValues)[number];
export const vehicleTypeEnum = pgEnum("vehicle_type", vehicleTypeValues);

export const DriverProfilesTable = pgTable(
  "driver_profiles",
  {
    id,
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    status: driverStatusEnum().notNull().default("pending"),
    vehicleType: vehicleTypeEnum().notNull().default("motorcycle"),
    vehiclePlate: varchar({ length: 32 }),
    /** Driver-toggled; only approved + available drivers are assignable. */
    isAvailable: boolean().notNull().default(false),
    /**
     * Running COD balance (EGP). NEGATIVE = driver owes the company (collected
     * less than order totals); positive/zero after settlement. Denormalized
     * running total of `driver_ledger_entries`, kept in sync per ledger write.
     */
    balance: numeric({ precision: 10, scale: 2 }).notNull().default("0.00"),
    adminNotes: text(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("driver_profiles_user_unique").on(table.userId),
    // Assignable-drivers query: approved + available + not soft-deleted.
    index("driver_profiles_status_available_idx")
      .on(table.status, table.isAvailable)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const driverProfilesRelations = relations(
  DriverProfilesTable,
  ({ one }) => ({
    user: one(UsersTable, {
      fields: [DriverProfilesTable.userId],
      references: [UsersTable.id],
    }),
  }),
);

export type DriverProfile = typeof DriverProfilesTable.$inferSelect;
