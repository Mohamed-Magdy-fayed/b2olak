import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { z } from "zod";

import type { Db } from "@workspace/db/client";
import { UsersTable } from "@workspace/db/schemas/auth/users";
import { AddressesTable } from "@workspace/db/schemas/orders/addresses";
import { ItemPriceStatsTable } from "@workspace/db/schemas/catalog/item-price-stats";
import { ItemUnitsTable } from "@workspace/db/schemas/catalog/item-units";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import { UnitsTable } from "@workspace/db/schemas/catalog/units";
import { inngest } from "@workspace/integrations/inngest/client";
import { getDeliveryFeeEgp } from "../lib/settings";
import { applyTransition } from "../lib/order-transitions";
import { OrderItemsTable } from "@workspace/db/schemas/orders/order-items";
import { OrderStatusEventsTable } from "@workspace/db/schemas/orders/order-status-events";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import {
  canCustomerEditItems,
  canTransition,
} from "@workspace/validators/order-status";
import { cancelOrderSchema, placeOrderSchema } from "@workspace/validators/orders";

import {
  createTRPCRouter,
  customerProcedure,
  protectedProcedure,
} from "../init";
import { getLimiter } from "../ratelimit";

/** Resolve a merged item to its canonical target (follows one merge hop). */
async function resolveItemIds(db: Db, itemIds: string[]) {
  const items = await db.query.ItemsTable.findMany({
    where: and(inArray(ItemsTable.id, itemIds), isNull(ItemsTable.deletedAt)),
  });

  const mergedTargetIds = items
    .filter((i) => i.status === "merged" && i.mergedIntoItemId)
    .map((i) => i.mergedIntoItemId!);

  const targets =
    mergedTargetIds.length > 0
      ? await db.query.ItemsTable.findMany({
          where: inArray(ItemsTable.id, mergedTargetIds),
        })
      : [];
  const targetMap = new Map(targets.map((t) => [t.id, t]));

  const map = new Map(items.map((item) => [item.id, item]));
  for (const item of items) {
    if (item.status === "merged" && item.mergedIntoItemId) {
      const target = targetMap.get(item.mergedIntoItemId);
      if (target) map.set(item.id, target);
    }
  }
  return map;
}

export const ordersRouter = createTRPCRouter({
  place: customerProcedure
    .input(placeOrderSchema)
    .mutation(async ({ ctx, input }) => {
      // Run rate-limit check in parallel with the first DB round-trip.
      // Rate-limited requests are rare; the wasted DB work is negligible.
      const rlLimiter =
        process.env.UPSTASH_REDIS_REST_URL || process.env.NODE_ENV === "production"
          ? getLimiter("order-place", 5, "1 h")
          : null;

      // Scam prevention: only phone-verified accounts may place orders.
      // OTP sign-ins are verified by definition; OAuth-created accounts must
      // link a phone first (auth.requestPhoneLink/confirmPhoneLink).
      const [rl, placer, address] = await Promise.all([
        rlLimiter?.limit(ctx.session.user.id) ?? Promise.resolve({ success: true }),
        ctx.db.query.UsersTable.findFirst({
          where: and(
            eq(UsersTable.id, ctx.session.user.id),
            isNull(UsersTable.deletedAt),
          ),
          columns: { phoneVerifiedAt: true },
        }),
        ctx.db.query.AddressesTable.findFirst({
          where: and(
            eq(AddressesTable.id, input.addressId),
            eq(AddressesTable.userId, ctx.session.user.id),
            isNull(AddressesTable.deletedAt),
          ),
        }),
      ]);
      if (!rl.success) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "errors.tooManyRequests" });
      }
      if (!placer?.phoneVerifiedAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "auth.phoneVerificationRequired",
        });
      }
      if (!address) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "orders.addressNotFound" });
      }

      const [itemMap, deliveryFee] = await Promise.all([
        resolveItemIds(ctx.db, input.items.map((line) => line.itemId)),
        getDeliveryFeeEgp(ctx.db),
      ]);
      for (const line of input.items) {
        if (!itemMap.has(line.itemId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "orders.itemNotFound" });
        }
      }

      // Security: a unit may only be ordered if it is linked to the (canonical)
      // item — EXCEPT money-kind units ("EGP worth"), which are offered on every
      // item and so are allowed globally. Build (itemId:unitId) → {code, kind}
      // for the snapshot, then reject any line whose unit isn't allowed.
      const canonicalIds = [
        ...new Set([...itemMap.values()].map((item) => item.id)),
      ];
      const [links, moneyUnits] = await Promise.all([
        ctx.db.query.ItemUnitsTable.findMany({
          where: inArray(ItemUnitsTable.itemId, canonicalIds),
          with: { unit: { columns: { code: true, kind: true } } },
        }),
        ctx.db.query.UnitsTable.findMany({
          where: and(
            eq(UnitsTable.kind, "money"),
            eq(UnitsTable.isActive, true),
            isNull(UnitsTable.deletedAt),
          ),
          columns: { id: true, code: true, kind: true },
        }),
      ]);
      const unitInfoByKey = new Map(
        links.map((link) => [
          `${link.itemId}:${link.unitId}`,
          { code: link.unit.code, kind: link.unit.kind },
        ]),
      );
      const moneyUnitById = new Map(
        moneyUnits.map((u) => [u.id, { code: u.code, kind: u.kind }]),
      );
      const unitInfoForLine = (line: { itemId: string; unitId: string }) => {
        const item = itemMap.get(line.itemId)!;
        const info =
          unitInfoByKey.get(`${item.id}:${line.unitId}`) ??
          moneyUnitById.get(line.unitId);
        if (!info) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "orders.unitNotAllowed",
          });
        }
        return info;
      };
      // Validate up-front so a bad line fails before we open the transaction.
      for (const line of input.items) unitInfoForLine(line);

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
            const unit = unitInfoForLine(line);
            return {
              orderId: order.id,
              itemId: item.id,
              nameSnapshotEn: item.nameEn,
              nameSnapshotAr: item.nameAr,
              qty: String(line.qty),
              unit: unit.code,
              unitKind: unit.kind,
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

      const placedEventId = `order:${result.id}:null:placed`;
      console.info(`[order:place] emit event=${placedEventId} order=${result.id}`);
      await Promise.all([
        inngest.send({
          id: placedEventId,
          name: "order/status.changed",
          data: { orderId: result.id, fromStatus: null, toStatus: "placed" },
        }),
        inngest.send({
          name: "order/placed",
          data: {
            orderId: result.id,
            userId: ctx.session.user.id,
            value: Number(deliveryFee),
            currency: "EGP",
          },
        }),
      ]).catch(() => {
        // notifications are best-effort
      });

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
          statusEvents: true,
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

      // Attach the market-price average per line (itemId + snapshot unit code):
      // the customer's rough estimate and the driver's price sanity-check both
      // read this. Null when there's no data for that item/unit.
      const itemIds = [...new Set(order.items.map((line) => line.itemId))];
      const stats = itemIds.length
        ? await ctx.db.query.ItemPriceStatsTable.findMany({
            where: inArray(ItemPriceStatsTable.itemId, itemIds),
            columns: {
              itemId: true,
              unit: true,
              avgPrice: true,
              sampleCount: true,
            },
          })
        : [];
      const statByKey = new Map(
        stats.map((s) => [
          `${s.itemId}::${s.unit}`,
          {
            avgPrice: s.avgPrice != null ? Number(s.avgPrice) : null,
            sampleCount: s.sampleCount,
          },
        ]),
      );

      // The assigned driver's name + phone ride along so the customer can
      // reach them during an active delivery.
      return {
        ...order,
        items: order.items.map((line) => {
          const stat = statByKey.get(`${line.itemId}::${line.unit}`);
          return {
            ...line,
            marketAvgPrice: stat?.avgPrice ?? null,
            marketSampleCount: stat?.sampleCount ?? 0,
          };
        }),
      };
    }),

  /**
   * Allowed unit codes per line for an order the customer may still edit.
   * Returns `{}` once the order has left the editable window, so the UI hides
   * the unit picker. Codes map to i18n keys (`units.<code>`).
   */
  lineUnitOptions: customerProcedure
    .input(z.object({ orderId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.OrdersTable.findFirst({
        where: and(
          eq(OrdersTable.id, input.orderId),
          eq(OrdersTable.customerId, ctx.session.user.id),
          isNull(OrdersTable.deletedAt),
        ),
        with: { items: { columns: { id: true, itemId: true } } },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canCustomerEditItems(order.status)) return {};

      const itemIds = [...new Set(order.items.map((line) => line.itemId))];
      const [links, moneyUnits] = await Promise.all([
        ctx.db.query.ItemUnitsTable.findMany({
          where: inArray(ItemUnitsTable.itemId, itemIds),
          with: { unit: { columns: { code: true } } },
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
        }),
        ctx.db.query.UnitsTable.findMany({
          where: and(
            eq(UnitsTable.kind, "money"),
            eq(UnitsTable.isActive, true),
            isNull(UnitsTable.deletedAt),
          ),
          columns: { code: true },
        }),
      ]);
      const moneyCodes = moneyUnits.map((u) => u.code);
      const codesByItem = new Map<string, string[]>();
      for (const link of links) {
        const list = codesByItem.get(link.itemId) ?? [];
        list.push(link.unit.code);
        codesByItem.set(link.itemId, list);
      }

      // Money units ("EGP worth") are orderable on every item — always allowed.
      const result: Record<string, string[]> = {};
      for (const line of order.items) {
        result[line.id] = [...(codesByItem.get(line.itemId) ?? []), ...moneyCodes];
      }
      return result;
    }),

  /**
   * Change a line's unit of measure while the order is still customer-editable
   * (before the driver starts shopping). The new unit must be an allowed unit
   * for that line's item; `unit` is the unit `code` snapshot.
   */
  updateLineUnit: customerProcedure
    .input(
      z.object({
        orderId: z.uuid(),
        orderItemId: z.uuid(),
        unit: z.string().min(1).max(32),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.query.OrdersTable.findFirst({
        where: and(
          eq(OrdersTable.id, input.orderId),
          eq(OrdersTable.customerId, ctx.session.user.id),
          isNull(OrdersTable.deletedAt),
        ),
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canCustomerEditItems(order.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "orders.itemsLocked",
        });
      }

      const line = await ctx.db.query.OrderItemsTable.findFirst({
        where: and(
          eq(OrderItemsTable.id, input.orderItemId),
          eq(OrderItemsTable.orderId, order.id),
        ),
        columns: { id: true, itemId: true },
      });
      if (!line) throw new TRPCError({ code: "NOT_FOUND" });

      // The chosen unit must be linked to this line's item, OR be an active
      // money unit ("EGP worth", offered on every item). Capture its kind so
      // the order line's snapshot stays consistent with the new unit.
      const links = await ctx.db.query.ItemUnitsTable.findMany({
        where: eq(ItemUnitsTable.itemId, line.itemId),
        with: { unit: { columns: { code: true, kind: true } } },
      });
      const linked = links.find((link) => link.unit.code === input.unit);
      const moneyUnit = linked
        ? null
        : await ctx.db.query.UnitsTable.findFirst({
            where: and(
              eq(UnitsTable.code, input.unit),
              eq(UnitsTable.kind, "money"),
              eq(UnitsTable.isActive, true),
              isNull(UnitsTable.deletedAt),
            ),
            columns: { kind: true },
          });
      const kind = linked?.unit.kind ?? moneyUnit?.kind;
      if (!kind) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "orders.unitNotAllowed",
        });
      }

      await ctx.db
        .update(OrderItemsTable)
        .set({ unit: input.unit, unitKind: kind, updatedBy: ctx.session.user.id })
        .where(eq(OrderItemsTable.id, line.id));

      return { ok: true as const };
    }),

  /**
   * Returns order items enriched with full current unit data so the mobile
   * client can repopulate the cart in one tap ("Order Again"). Skips items
   * that were marked unavailable by the driver.
   */
  reorderData: customerProcedure
    .input(z.object({ orderId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.OrdersTable.findFirst({
        where: and(
          eq(OrdersTable.id, input.orderId),
          eq(OrdersTable.customerId, ctx.session.user.id),
          isNull(OrdersTable.deletedAt),
        ),
        with: {
          items: {
            where: ne(OrderItemsTable.status, "unavailable"),
          },
        },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const itemIds = [...new Set(order.items.map((l) => l.itemId))];
      if (itemIds.length === 0) return [];

      const [links, moneyUnits] = await Promise.all([
        ctx.db.query.ItemUnitsTable.findMany({
          where: inArray(ItemUnitsTable.itemId, itemIds),
          with: {
            unit: {
              columns: { id: true, code: true, nameEn: true, nameAr: true, kind: true },
            },
          },
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
        }),
        ctx.db.query.UnitsTable.findMany({
          where: and(
            eq(UnitsTable.kind, "money"),
            eq(UnitsTable.isActive, true),
            isNull(UnitsTable.deletedAt),
          ),
          columns: { id: true, code: true, nameEn: true, nameAr: true, kind: true },
        }),
      ]);

      // Build itemId → CartUnit[] (item-specific units + money units appended)
      const unitsByItem = new Map<string, { id: string; code: string; nameEn: string; nameAr: string; kind: string }[]>();
      for (const link of links) {
        const list = unitsByItem.get(link.itemId) ?? [];
        list.push(link.unit);
        unitsByItem.set(link.itemId, list);
      }

      return order.items.map((line) => {
        const itemUnits = [...(unitsByItem.get(line.itemId) ?? []), ...moneyUnits];
        const selectedUnit = itemUnits.find((u) => u.code === line.unit);
        return {
          itemId: line.itemId,
          nameEn: line.nameSnapshotEn,
          nameAr: line.nameSnapshotAr,
          qty: Number(line.qty),
          selectedUnitId: selectedUnit?.id ?? "",
          units: itemUnits,
          customerNote: line.customerNote ?? undefined,
        };
      });
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
