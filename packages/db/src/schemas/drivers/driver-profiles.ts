import { relations } from "drizzle-orm";
import {
  boolean,
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
    adminNotes: text(),
    ...auditColumns,
  },
  (table) => [uniqueIndex("driver_profiles_user_unique").on(table.userId)],
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
