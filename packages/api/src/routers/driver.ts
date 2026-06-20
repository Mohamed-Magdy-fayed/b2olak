import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { DriverProfilesTable } from "@workspace/db/schemas/drivers/driver-profiles";
import { OrderItemsTable } from "@workspace/db/schemas/orders/order-items";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { markDeliveredSchema, updateLineSchema } from "@workspace/validators/driver";
import { codTotal, lineTotal, toMoney } from "@workspace/validators/totals";

import { createTRPCRouter, driverProcedure } from "../init";
import { applyTransition } from "../lib/order-transitions";

const DRIVER_ACTIVE = ["assigned", "shopping", "purchased", "delivering"] as const;

async function ownedOrder(
  db: Parameters<typeof applyTransition>[0],
  orderId: string,
  driverId: string,
) {
  const order = await db.query.OrdersTable.findFirst({
    where: and(
      eq(OrdersTable.id, orderId),
      eq(OrdersTable.driverId, driverId),
      isNull(OrdersTable.deletedAt),
    ),
  });
  if (!order) throw new TRPCError({ code: "NOT_FOUND" });
  return order;
}

/** Recompute items total from found/substituted lines; COD = items + fee. */
async function recomputeTotals(
  db: Parameters<typeof applyTransition>[0],
  orderId: string,
  actor: string,
) {
  const [sums] = await db
    .select({
      itemsTotal: sql<string>`coalesce(sum(${OrderItemsTable.actualLineTotal}), 0)::numeric(10,2)`,
    })
    .from(OrderItemsTable)
    .where(
      and(
        eq(OrderItemsTable.orderId, orderId),
        inArray(OrderItemsTable.status, ["found", "substituted"]),
      ),
    );

  const order = await db.query.OrdersTable.findFirst({
    where: eq(OrdersTable.id, orderId),
  });
  if (!order) return;

  const itemsTotal = Number(sums?.itemsTotal ?? 0);
  const cod = codTotal(itemsTotal, Number(order.deliveryFee));

  await db
    .update(OrdersTable)
    .set({
      actualItemsTotal: toMoney(itemsTotal),
      codTotal: toMoney(cod),
      updatedBy: actor,
    })
    .where(eq(OrdersTable.id, orderId));

  return { itemsTotal, codTotal: cod };
}

export const driverRouter = createTRPCRouter({
  setAvailability: driverProcedure
    .input(z.object({ isAvailable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(DriverProfilesTable)
        .set({ isAvailable: input.isAvailable, updatedBy: ctx.session.user.id })
        .where(eq(DriverProfilesTable.userId, ctx.session.user.id));
      return { ok: true as const };
    }),

  me: driverProcedure.query(({ ctx }) => ({
    profile: ctx.driverProfile,
  })),

  myOrders: driverProcedure.query(async ({ ctx }) => {
    const active = await ctx.db.query.OrdersTable.findMany({
      where: and(
        eq(OrdersTable.driverId, ctx.session.user.id),
        inArray(OrdersTable.status, [...DRIVER_ACTIVE]),
        isNull(OrdersTable.deletedAt),
      ),
      with: { items: true },
      orderBy: [desc(OrdersTable.assignedAt)],
    });
    const history = await ctx.db.query.OrdersTable.findMany({
      where: and(
        eq(OrdersTable.driverId, ctx.session.user.id),
        inArray(OrdersTable.status, ["delivered", "cancelled"]),
        isNull(OrdersTable.deletedAt),
      ),
      orderBy: [desc(OrdersTable.deliveredAt), desc(OrdersTable.createdAt)],
      limit: 30,
    });

    // Daily COD recap (journey D6)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayDelivered = history.filter(
      (o) => o.status === "delivered" && o.deliveredAt && o.deliveredAt >= todayStart,
    );
    const todayCod = todayDelivered.reduce(
      (sum, o) => sum + Number(o.codTotal ?? 0),
      0,
    );

    return {
      active,
      history,
      today: { delivered: todayDelivered.length, cod: todayCod },
    };
  }),

  startShopping: driverProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ownedOrder(ctx.db, input.orderId, ctx.session.user.id);
      await applyTransition(ctx.db, order, "shopping", {
        id: ctx.session.user.id,
        role: "driver",
      });
      return { ok: true as const };
    }),

  /** Shopping checklist (journey D4) — price required for found/substituted. */
  updateLine: driverProcedure
    .input(updateLineSchema)
    .mutation(async ({ ctx, input }) => {
      const line = await ctx.db.query.OrderItemsTable.findFirst({
        where: eq(OrderItemsTable.id, input.orderItemId),
        with: { order: true },
      });
      if (!line || line.order.driverId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      // Prices stay editable until the driver starts delivering (D4-U1)
      if (!["shopping", "purchased"].includes(line.order.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "orders.invalidTransition" });
      }

      const needsPrice = input.status === "found" || input.status === "substituted";
      if (needsPrice && input.actualUnitPrice === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "driver.priceRequired" });
      }

      const lineTotalStr = needsPrice
        ? toMoney(lineTotal(input.actualUnitPrice!, Number(line.qty)))
        : null;

      await ctx.db
        .update(OrderItemsTable)
        .set({
          status: input.status,
          actualUnitPrice: needsPrice
            ? toMoney(input.actualUnitPrice!)
            : null,
          actualLineTotal: lineTotalStr,
          updatedBy: ctx.session.user.id,
        })
        .where(eq(OrderItemsTable.id, input.orderItemId));

      const totals = await recomputeTotals(
        ctx.db,
        line.orderId,
        ctx.session.user.id,
      );
      return { ok: true as const, totals };
    }),

  doneShopping: driverProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ownedOrder(ctx.db, input.orderId, ctx.session.user.id);

      const [pending] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(OrderItemsTable)
        .where(
          and(
            eq(OrderItemsTable.orderId, order.id),
            eq(OrderItemsTable.status, "pending"),
          ),
        );
      if ((pending?.count ?? 0) > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "driver.linesPending" });
      }

      await recomputeTotals(ctx.db, order.id, ctx.session.user.id);
      await applyTransition(ctx.db, order, "purchased", {
        id: ctx.session.user.id,
        role: "driver",
      });
      return { ok: true as const };
    }),

  startDelivery: driverProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ownedOrder(ctx.db, input.orderId, ctx.session.user.id);
      await applyTransition(ctx.db, order, "delivering", {
        id: ctx.session.user.id,
        role: "driver",
      });
      return { ok: true as const };
    }),

  markDelivered: driverProcedure
    .input(markDeliveredSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ownedOrder(ctx.db, input.orderId, ctx.session.user.id);
      await applyTransition(
        ctx.db,
        order,
        "delivered",
        { id: ctx.session.user.id, role: "driver" },
        { extra: { deliveredAt: new Date(), amountCollected: input.amountCollected.toFixed(2) } },
      );
      return { ok: true as const, codTotal: order.codTotal, amountCollected: input.amountCollected.toFixed(2) };
    }),
});
