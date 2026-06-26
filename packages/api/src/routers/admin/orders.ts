import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { DriverProfilesTable } from "@workspace/db/schemas/drivers/driver-profiles";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { ORDER_STATUSES } from "@workspace/validators/order-status";

import { adminProcedure, createTRPCRouter } from "../../init";
import { applyTransition } from "../../lib/order-transitions";
import {
  dateBounds,
  EXPORT_ROW_CAP,
  facetValues,
  isDateRangeValue,
  isNumberRangeValue,
  pageMath,
  tableExportInputSchema,
  tableListInputSchema,
} from "../../lib/table-query";

function ordersWhere(input: {
  columnFilters: { id: string; value: unknown }[];
  globalFilter?: string;
}): SQL | undefined {
  const conditions: (SQL | undefined)[] = [isNull(OrdersTable.deletedAt)];

  for (const filter of input.columnFilters) {
    if (filter.id === "status") {
      const values = facetValues(filter.value, ORDER_STATUSES);
      if (values.length) conditions.push(inArray(OrdersTable.status, values));
    } else if (filter.id === "createdAt" && isDateRangeValue(filter.value)) {
      const { from, to } = dateBounds(filter.value);
      if (from) conditions.push(gte(OrdersTable.createdAt, from));
      if (to) conditions.push(lte(OrdersTable.createdAt, to));
    } else if (filter.id === "codTotal" && isNumberRangeValue(filter.value)) {
      if (typeof filter.value.min === "number") {
        conditions.push(gte(OrdersTable.codTotal, filter.value.min.toFixed(2)));
      }
      if (typeof filter.value.max === "number") {
        conditions.push(lte(OrdersTable.codTotal, filter.value.max.toFixed(2)));
      }
    } else if (
      filter.id === "area" &&
      typeof filter.value === "string" &&
      filter.value.trim()
    ) {
      conditions.push(ilike(OrdersTable.area, `%${filter.value.trim()}%`));
    }
  }

  const q = input.globalFilter?.trim();
  if (q) {
    const pattern = `%${q}%`;
    const asNumber = Number.parseInt(q, 10);
    conditions.push(
      or(
        Number.isFinite(asNumber) && String(asNumber) === q
          ? eq(OrdersTable.orderNumber, asNumber)
          : undefined,
        sql`exists (select 1 from "users" u where u."id" = ${OrdersTable.customerId} and (u."name" ilike ${pattern} or u."phone" ilike ${pattern}))`,
      ),
    );
  }

  return and(...conditions);
}

const ORDER_SORTABLE = {
  orderNumber: OrdersTable.orderNumber,
  createdAt: OrdersTable.createdAt,
  codTotal: OrdersTable.codTotal,
  status: OrdersTable.status,
} as const;

function ordersOrderBy(sorting: { id: string; desc: boolean }[]) {
  const explicit = sorting
    .filter((s): s is { id: keyof typeof ORDER_SORTABLE; desc: boolean } =>
      s.id in ORDER_SORTABLE,
    )
    .map((s) => (s.desc ? desc(ORDER_SORTABLE[s.id]) : asc(ORDER_SORTABLE[s.id])));
  if (explicit.length) return explicit;
  // Default: needs-assignment first, newest first (journey A6).
  return [
    sql`case when ${OrdersTable.status} = 'placed' then 0 else 1 end`,
    desc(OrdersTable.createdAt),
  ];
}

export const adminOrdersRouter = createTRPCRouter({
  list: adminProcedure
    .input(tableListInputSchema)
    .query(async ({ ctx, input }) => {
      const where = ordersWhere(input);

      const [{ value: total } = { value: 0 }] = await ctx.db
        .select({ value: count() })
        .from(OrdersTable)
        .where(where);

      const { pageCount, offset } = pageMath(total, input.page, input.perPage);

      const rows = await ctx.db.query.OrdersTable.findMany({
        where,
        with: {
          customer: { columns: { id: true, name: true, phone: true } },
          driver: { columns: { id: true, name: true, phone: true } },
          items: { columns: { id: true } },
        },
        orderBy: ordersOrderBy(input.sorting),
        offset,
        limit: input.perPage,
      });

      return { rows, pageCount, total };
    }),

  exportRows: adminProcedure
    .input(tableExportInputSchema)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.OrdersTable.findMany({
        where: ordersWhere(input),
        with: {
          customer: { columns: { name: true, phone: true } },
          driver: { columns: { name: true } },
          items: { columns: { id: true } },
        },
        orderBy: ordersOrderBy(input.sorting),
        limit: EXPORT_ROW_CAP,
      });

      return {
        rows: rows.map((order) => ({
          orderNumber: order.orderNumber,
          status: order.status,
          customerName: order.customer?.name ?? "",
          customerPhone: order.customer?.phone ?? "",
          driverName: order.driver?.name ?? "",
          itemCount: order.items.length,
          city: order.city,
          area: order.area,
          street: order.street,
          deliveryFee: order.deliveryFee,
          codTotal: order.codTotal ?? "",
          createdAt: order.createdAt.toISOString(),
          deliveredAt: order.deliveredAt?.toISOString() ?? "",
        })),
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

    const userIds = profiles.map((p) => p.userId);
    const counts = userIds.length
      ? await ctx.db
          .select({
            driverId: OrdersTable.driverId,
            active: sql<number>`count(*) filter (where ${OrdersTable.status} in ('assigned','shopping','purchased','delivering'))::int`,
          })
          .from(OrdersTable)
          .where(inArray(OrdersTable.driverId, userIds))
          .groupBy(OrdersTable.driverId)
      : [];
    const activeByDriver = new Map(
      counts
        .filter((c): c is typeof c & { driverId: string } => c.driverId !== null)
        .map((c) => [c.driverId, c.active]),
    );

    return profiles.map((profile) => ({
      ...profile,
      activeOrders: activeByDriver.get(profile.userId) ?? 0,
    }));
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
