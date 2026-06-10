/**
 * Order status machine — single source of truth.
 * Enforced server-side in the orders/driver/admin routers; rendered as a timeline
 * client-side. See docs/03-data-model.md §3.
 */

export const ORDER_STATUSES = [
  "placed",
  "assigned",
  "shopping",
  "purchased",
  "delivering",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "assigned",
  "shopping",
  "purchased",
  "delivering",
];

export type TransitionActor = "customer" | "driver" | "admin";

type Transition = {
  from: OrderStatus;
  to: OrderStatus;
  actors: TransitionActor[];
};

const TRANSITIONS: Transition[] = [
  { from: "placed", to: "assigned", actors: ["admin"] },
  { from: "assigned", to: "assigned", actors: ["admin"] }, // reassign
  { from: "assigned", to: "shopping", actors: ["driver"] },
  { from: "shopping", to: "purchased", actors: ["driver"] },
  { from: "purchased", to: "delivering", actors: ["driver"] },
  { from: "delivering", to: "delivered", actors: ["driver"] },
  { from: "placed", to: "cancelled", actors: ["customer", "admin"] },
  { from: "assigned", to: "cancelled", actors: ["customer", "admin"] },
  { from: "shopping", to: "cancelled", actors: ["admin"] },
  { from: "purchased", to: "cancelled", actors: ["admin"] },
  { from: "delivering", to: "cancelled", actors: ["admin"] },
];

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
): boolean {
  return TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.actors.includes(actor),
  );
}

/** Admin recovery overrides bypass the table but must always be audited with a note. */
export function isTerminal(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled";
}
