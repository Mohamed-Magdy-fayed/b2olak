import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { DriverProfilesTable } from "@workspace/db/schemas/drivers/driver-profiles";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { ORDER_STATUSES } from "@workspace/validators/order-status";

import { adminProcedure, createTRPCRouter } from "../../init";
import { applyTransition } from "../../lib/order-transitions";

export const adminOrdersRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(ORDER_STATUSES).optional(),
        cursor: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = and(
        isNull(OrdersTable.deletedAt),
        input.status ? eq(OrdersTable.status, input.status) : undefined,
      );
      const orders = await ctx.db.query.OrdersTable.findMany({
        where,
        with: {
          customer: { columns: { id: true, name: true, phone: true } },
          driver: { columns: { id: true, name: true, phone: true } },
          items: { columns: { id: true } },
        },
        // needs-assignment first, oldest first within placed (journey A6)
        orderBy: [
          sql`case when ${OrdersTable.status} = 'placed' then 0 else 1 end`,
          desc(OrdersTable.createdAt),
        ],
        offset: input.cursor,
        limit: input.limit + 1,
      });
      const hasMore = orders.length > input.limit;
      return {
        orders: hasMore ? orders.slice(0, input.limit) : orders,
        nextCursor: hasMore ? input.cursor + input.limit : null,
      };
    }),

  byId: adminProcedure
    .input(z.object({ orderId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.OrdersTable.findFirst({
        where: and(eq(OrdersTable.id, input.orderId), isNull(OrdersTable.deletedAt)),
        with: {
          customer: { columns: { id: true, name: true, phone: true } },
          driver: { columns: { id: true, name: true, phone: true } },
          items: true,
          statusEvents: { orderBy: (t, { asc }) => [asc(t.createdAt)] },
        },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      return order;
    }),

  /** Drivers eligible for assignment: approved + available (journey A6). */
  assignableDrivers: adminProcedure.query(async ({ ctx }) => {
    const profiles = await ctx.db.query.DriverProfilesTable.findMany({
      where: and(
        eq(DriverProfilesTable.status, "approved"),
        eq(DriverProfilesTable.isAvailable, true),
        isNull(DriverProfilesTable.deletedAt),
      ),
      with: { user: { columns: { id: true, name: true, phone: true } } },
    });

    return Promise.all(
      profiles.map(async (profile) => {
        const [active] = await ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(OrdersTable)
          .where(
            and(
              eq(OrdersTable.driverId, profile.userId),
              sql`${OrdersTable.status} in ('assigned','shopping','purchased','delivering')`,
            ),
          );
        return { ...profile, activeOrders: active?.count ?? 0 };
      }),
    );
  }),

  assign: adminProcedure
    .input(z.object({ orderId: z.uuid(), driverId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.query.OrdersTable.findFirst({
        where: and(eq(OrdersTable.id, input.orderId), isNull(OrdersTable.deletedAt)),
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const profile = await ctx.db.query.DriverProfilesTable.findFirst({
        where: and(
          eq(DriverProfilesTable.userId, input.driverId),
          eq(DriverProfilesTable.status, "approved"),
          isNull(DriverProfilesTable.deletedAt),
        ),
      });
      if (!profile) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "admin.orders.driverNotEligible" });
      }

      await applyTransition(
        ctx.db,
        order,
        "assigned",
        { id: ctx.session.user.id, role: "admin" },
        { extra: { driverId: input.driverId, assignedAt: new Date() } },
      );
      return { ok: true as const };
    }),

  cancel: adminProcedure
    .input(z.object({ orderId: z.uuid(), reason: z.string().trim().min(2).max(300) }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.query.OrdersTable.findFirst({
        where: and(eq(OrdersTable.id, input.orderId), isNull(OrdersTable.deletedAt)),
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      await applyTransition(
        ctx.db,
        order,
        "cancelled",
        { id: ctx.session.user.id, role: "admin" },
        {
          note: input.reason,
          extra: { cancelledBy: "admin", cancelReason: input.reason },
        },
      );
      return { ok: true as const };
    }),

  /** Recovery override — bypasses the machine, always audited (A6 §6). */
  overrideStatus: adminProcedure
    .input(
      z.object({
        orderId: z.uuid(),
        toStatus: z.enum(ORDER_STATUSES),
        note: z.string().trim().min(2).max(300),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.query.OrdersTable.findFirst({
        where: and(eq(OrdersTable.id, input.orderId), isNull(OrdersTable.deletedAt)),
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      await applyTransition(
        ctx.db,
        order,
        input.toStatus,
        { id: ctx.session.user.id, role: "admin" },
        { note: input.note, override: true },
      );
      return { ok: true as const };
    }),
});
