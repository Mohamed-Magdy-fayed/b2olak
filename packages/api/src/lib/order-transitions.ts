import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { Db } from "@workspace/db/client";
import { OrderStatusEventsTable } from "@workspace/db/schemas/orders/order-status-events";
import { type Order, OrdersTable } from "@workspace/db/schemas/orders/orders";
import { inngest } from "@workspace/integrations/inngest/client";
import {
  canTransition,
  type OrderStatus,
  type TransitionActor,
} from "@workspace/validators/order-status";

/**
 * The ONLY way an order changes status: validates the machine, updates the
 * row + extra fields, writes the timeline event in the same transaction, and
 * fires the notification event (best-effort).
 */
export async function applyTransition(
  db: Db,
  order: Order,
  toStatus: OrderStatus,
  actor: { id: string; role: TransitionActor },
  options: {
    note?: string;
    /** Admin recovery override — bypasses the machine, note required. */
    override?: boolean;
    extra?: Partial<typeof OrdersTable.$inferInsert>;
  } = {},
) {
  if (options.override) {
    if (actor.role !== "admin" || !options.note) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
  } else if (!canTransition(order.status, toStatus, actor.role)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "orders.invalidTransition" });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(OrdersTable)
      .set({ status: toStatus, updatedBy: actor.id, ...options.extra })
      .where(eq(OrdersTable.id, order.id));
    await tx.insert(OrderStatusEventsTable).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus,
      actorUserId: actor.id,
      actorRole: actor.role,
      note: options.note,
      createdBy: actor.id,
    });
  });

  // The `id` field is Inngest's dedup key (24-hour window): if this send is
  // retried at the HTTP level, or applyTransition is called twice concurrently
  // for the same order + transition, Inngest accepts only ONE event and fires
  // the notification function once.
  const eventId = `order:${order.id}:${order.status ?? "null"}:${toStatus}`;
  console.info(`[transition] emit event=${eventId} order=${order.id} ${order.status} -> ${toStatus} actor=${actor.role}`);
  try {
    await inngest.send({
      id: eventId,
      name: "order/status.changed",
      data: { orderId: order.id, fromStatus: order.status, toStatus },
    });
  } catch {
    // notifications are best-effort; the order state is already correct
  }
}
