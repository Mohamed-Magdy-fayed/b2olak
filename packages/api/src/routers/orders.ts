import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import type { Db } from "@workspace/db/client";
import { UsersTable } from "@workspace/db/schemas/auth/users";
import { AddressesTable } from "@workspace/db/schemas/orders/addresses";
import { ItemUnitsTable } from "@workspace/db/schemas/catalog/item-units";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import { inngest } from "@workspace/integrations/inngest/client";
import { OrderItemsTable } from "@workspace/db/schemas/orders/order-items";
import { OrderStatusEventsTable } from "@workspace/db/schemas/orders/order-status-events";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { canTransition } from "@workspace/validators/order-status";
import { cancelOrderSchema, placeOrderSchema } from "@workspace/validators/orders";

import {
  createTRPCRouter,
  customerProcedure,
  protectedProcedure,
} from "../init";
import { enforceRateLimit } from "../ratelimit";

/** Resolve a merged item to its canonical target (follows one merge hop). */
async function resolveItemIds(db: Db, itemIds: string[]) {
  const items = await db.query.ItemsTable.findMany({
    where: and(inArray(ItemsTable.id, itemIds), isNull(ItemsTable.deletedAt)),
  });
  const map = new Map(items.map((item) => [item.id, item]));
  for (const item of items) {
    if (item.status === "merged" && item.mergedIntoItemId) {
      const target = await db.query.ItemsTable.findFirst({
        where: eq(ItemsTable.id, item.mergedIntoItemId),
      });
      if (target) map.set(item.id, target);
    }
  }
  return map;
}

export const ordersRouter = createTRPCRouter({
  place: customerProcedure
    .input(placeOrderSchema)
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("order-place", ctx.session.user.id, 5, "1 h");

      // Scam prevention: only phone-verified accounts may place orders.
      // OTP sign-ins are verified by definition; OAuth-created accounts must
      // link a phone first (auth.requestPhoneLink/confirmPhoneLink).
      const placer = await ctx.db.query.UsersTable.findFirst({
        where: and(
          eq(UsersTable.id, ctx.session.user.id),
          isNull(UsersTable.deletedAt),
        ),
        columns: { phoneVerifiedAt: true },
      });
      if (!placer?.phoneVerifiedAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "auth.phoneVerificationRequired",
        });
      }

      const address = await ctx.db.query.AddressesTable.findFirst({
        where: and(
          eq(AddressesTable.id, input.addressId),
          eq(AddressesTable.userId, ctx.session.user.id),
          isNull(AddressesTable.deletedAt),
        ),
      });
      if (!address) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "orders.addressNotFound" });
      }

      const itemMap = await resolveItemIds(
        ctx.db,
        input.items.map((line) => line.itemId),
      );
      for (const line of input.items) {
        if (!itemMap.has(line.itemId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "orders.itemNotFound" });
        }
      }

      // Security: a unit may only be ordered if it is linked to the (canonical)
      // item. Build (itemId:unitId) → unit code for the snapshot, then reject
      // any line whose chosen unit isn't an allowed unit for that item.
      const canonicalIds = [
        ...new Set([...itemMap.values()].map((item) => item.id)),
      ];
      const links = await ctx.db.query.ItemUnitsTable.findMany({
        where: inArray(ItemUnitsTable.itemId, canonicalIds),
        with: { unit: { columns: { code: true } } },
      });
      const unitCodeByKey = new Map(
        links.map((link) => [`${link.itemId}:${link.unitId}`, link.unit.code]),
      );
      const unitCodeForLine = (line: { itemId: string; unitId: string }) => {
        const item = itemMap.get(line.itemId)!;
        const code = unitCodeByKey.get(`${item.id}:${line.unitId}`);
        if (!code) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "orders.unitNotAllowed",
          });
        }
        return code;
      };
      // Validate up-front so a bad line fails before we open the transaction.
      for (const line of input.items) unitCodeForLine(line);

      // settings lib import kept local to avoid cycle noise
      const { getDeliveryFeeEgp } = await import("../lib/settings");
      const deliveryFee = await getDeliveryFeeEgp(ctx.db);

      const result = await ctx.db.transaction(async (tx) => {
        const [order] = await tx
          .insert(OrdersTable)
          .values({
            customerId: ctx.session.user.id,
            status: "placed",
            city: address.city,
            area: address.area,
            street: address.street,
            building: address.building,
            floor: address.floor,
            apartment: address.apartment,
            landmark: address.landmark,
            contactPhone: address.contactPhone,
            lat: address.lat,
            lng: address.lng,
            deliveryFee: deliveryFee.toFixed(2),
            customerNote: input.note,
            createdBy: ctx.session.user.id,
          })
          .returning();
        if (!order) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await tx.insert(OrderItemsTable).values(
          input.items.map((line) => {
            const item = itemMap.get(line.itemId)!;
            return {
              orderId: order.id,
              itemId: item.id,
              nameSnapshotEn: item.nameEn,
              nameSnapshotAr: item.nameAr,
              qty: String(line.qty),
              unit: unitCodeForLine(line),
              customerNote: line.note,
              createdBy: ctx.session.user.id,
            };
          }),
        );

        await tx.insert(OrderStatusEventsTable).values({
          orderId: order.id,
          fromStatus: null,
          toStatus: "placed",
          actorUserId: ctx.session.user.id,
          actorRole: "customer",
          createdBy: ctx.session.user.id,
        });

        return order;
      });

      try {
        await inngest.send({
          name: "order/status.changed",
          data: { orderId: result.id, fromStatus: null, toStatus: "placed" },
        });
      } catch {
        // notifications are best-effort
      }

      try {
        await inngest.send({
          name: "order/placed",
          data: {
            orderId: result.id,
            userId: ctx.session.user.id,
            value: Number(deliveryFee),
            currency: "EGP",
          },
        });
      } catch {
        // best-effort
      }

      return { orderId: result.id, orderNumber: result.orderNumber };
    }),

  mine: customerProcedure
    .input(z.object({ cursor: z.number().int().min(0).default(0) }).optional())
    .query(async ({ ctx, input }) => {
      const orders = await ctx.db.query.OrdersTable.findMany({
        where: and(
          eq(OrdersTable.customerId, ctx.session.user.id),
          isNull(OrdersTable.deletedAt),
        ),
        with: { items: true },
        orderBy: [desc(OrdersTable.createdAt)],
        offset: input?.cursor ?? 0,
        limit: 21,
      });
      const hasMore = orders.length > 20;
      return {
        orders: hasMore ? orders.slice(0, 20) : orders,
        nextCursor: hasMore ? (input?.cursor ?? 0) + 20 : null,
      };
    }),

  byId: protectedProcedure
    .input(z.object({ orderId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.OrdersTable.findFirst({
        where: and(eq(OrdersTable.id, input.orderId), isNull(OrdersTable.deletedAt)),
        with: {
          items: true,
          statusEvents: { orderBy: (t, { asc }) => [asc(t.createdAt)] },
          driver: { columns: { id: true, name: true, phone: true } },
        },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const user = ctx.session.user;
      const allowed =
        user.role === "admin" ||
        (user.role === "customer" && order.customerId === user.id) ||
        (user.role === "driver" && order.driverId === user.id);
      if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });

      // The assigned driver's name + phone ride along so the customer can
      // reach them during an active delivery.
      return order;
    }),

  cancel: customerProcedure
    .input(cancelOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.query.OrdersTable.findFirst({
        where: and(
          eq(OrdersTable.id, input.orderId),
          eq(OrdersTable.customerId, ctx.session.user.id),
          isNull(OrdersTable.deletedAt),
        ),
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canTransition(order.status, "cancelled", "customer")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "orders.cannotCancel" });
      }

      const { applyTransition } = await import("../lib/order-transitions");
      await applyTransition(
        ctx.db,
        order,
        "cancelled",
        { id: ctx.session.user.id, role: "customer" },
        {
          note: input.reason,
          extra: { cancelledBy: "customer", cancelReason: input.reason },
        },
      );

      return { ok: true as const };
    }),
});
