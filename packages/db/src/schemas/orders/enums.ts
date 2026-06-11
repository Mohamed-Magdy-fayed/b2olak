import { pgEnum } from "drizzle-orm/pg-core";

/** Shared order-domain enums — separate module to avoid circular imports. */

export const orderStatusValues = [
  "placed",
  "assigned",
  "shopping",
  "purchased",
  "delivering",
  "delivered",
  "cancelled",
] as const;
export const orderStatusEnum = pgEnum("order_status", orderStatusValues);

export const cancelledByValues = ["customer", "admin"] as const;
export const cancelledByEnum = pgEnum("cancelled_by", cancelledByValues);

export const orderItemStatusValues = [
  "pending",
  "found",
  "unavailable",
  "substituted",
] as const;
export const orderItemStatusEnum = pgEnum(
  "order_item_status",
  orderItemStatusValues,
);

export const actorRoleValues = ["customer", "driver", "admin", "system"] as const;
export const actorRoleEnum = pgEnum("actor_role", actorRoleValues);
