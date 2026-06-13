import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  type SQL,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import type { Db } from "@workspace/db/client";
import { UsersTable } from "@workspace/db/schemas/auth/users";
import {
  DriverProfilesTable,
  driverStatusValues,
  vehicleTypeValues,
} from "@workspace/db/schemas/drivers/driver-profiles";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { egyptianPhoneSchema } from "@workspace/validators/auth";

import { adminProcedure, createTRPCRouter } from "../../init";
import {
  dateBounds,
  EXPORT_ROW_CAP,
  facetValues,
  isDateRangeValue,
  pageMath,
  tableExportInputSchema,
  tableListInputSchema,
} from "../../lib/table-query";

function driversWhere(input: {
  columnFilters: { id: string; value: unknown }[];
  globalFilter?: string;
}): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    isNull(DriverProfilesTable.deletedAt),
  ];

  for (const filter of input.columnFilters) {
    if (filter.id === "status") {
      const values = facetValues(filter.value, driverStatusValues);
      if (values.length) {
        conditions.push(inArray(DriverProfilesTable.status, values));
      }
    } else if (filter.id === "vehicleType") {
      const values = facetValues(filter.value, vehicleTypeValues);
      if (values.length) {
        conditions.push(inArray(DriverProfilesTable.vehicleType, values));
      }
    } else if (filter.id === "isAvailable") {
      const values = facetValues(filter.value, ["true", "false"] as const);
      if (values.length === 1) {
        conditions.push(
          eq(DriverProfilesTable.isAvailable, values[0] === "true"),
        );
      }
    } else if (filter.id === "createdAt" && isDateRangeValue(filter.value)) {
      const { from, to } = dateBounds(filter.value);
      if (from) conditions.push(gte(DriverProfilesTable.createdAt, from));
      if (to) conditions.push(lte(DriverProfilesTable.createdAt, to));
    }
  }

  const q = input.globalFilter?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      sql`exists (select 1 from "users" u where u."id" = ${DriverProfilesTable.userId} and (u."name" ilike ${pattern} or u."phone" ilike ${pattern}))`,
    );
  }

  return and(...conditions);
}

const DRIVER_SORTABLE = {
  createdAt: DriverProfilesTable.createdAt,
  status: DriverProfilesTable.status,
  vehicleType: DriverProfilesTable.vehicleType,
} as const;

function driversOrderBy(sorting: { id: string; desc: boolean }[]) {
  const explicit = sorting
    .filter((s): s is { id: keyof typeof DRIVER_SORTABLE; desc: boolean } =>
      s.id in DRIVER_SORTABLE,
    )
    .map((s) =>
      s.desc ? desc(DRIVER_SORTABLE[s.id]) : asc(DRIVER_SORTABLE[s.id]),
    );
  return explicit.length ? explicit : [desc(DriverProfilesTable.createdAt)];
}

/** One grouped query for the page's order counts (no N+1). */
async function orderCountsFor(db: Db, userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, { active: number; delivered: number }>();
  }
  const rows = await db
    .select({
      driverId: OrdersTable.driverId,
      active: sql<number>`count(*) filter (where ${OrdersTable.status} in ('assigned','shopping','purchased','delivering'))::int`,
      delivered: sql<number>`count(*) filter (where ${OrdersTable.status} = 'delivered')::int`,
    })
    .from(OrdersTable)
    .where(inArray(OrdersTable.driverId, userIds))
    .groupBy(OrdersTable.driverId);

  return new Map(
    rows
      .filter((r): r is typeof r & { driverId: string } => r.driverId !== null)
      .map((r) => [r.driverId, { active: r.active, delivered: r.delivered }]),
  );
}

export const adminDriversRouter = createTRPCRouter({
  list: adminProcedure
    .input(tableListInputSchema)
    .query(async ({ ctx, input }) => {
      const where = driversWhere(input);

      const [{ value: total } = { value: 0 }] = await ctx.db
        .select({ value: count() })
        .from(DriverProfilesTable)
        .where(where);

      const { pageCount, offset } = pageMath(total, input.page, input.perPage);

      const profiles = await ctx.db.query.DriverProfilesTable.findMany({
        where,
        with: {
          user: {
            columns: { id: true, name: true, phone: true, status: true },
          },
        },
        orderBy: driversOrderBy(input.sorting),
        offset,
        limit: input.perPage,
      });

      const counts = await orderCountsFor(
        ctx.db,
        profiles.map((p) => p.userId),
      );

      return {
        rows: profiles.map((profile) => ({
          ...profile,
          activeOrders: counts.get(profile.userId)?.active ?? 0,
          deliveredOrders: counts.get(profile.userId)?.delivered ?? 0,
        })),
        pageCount,
        total,
      };
    }),

  exportRows: adminProcedure
    .input(tableExportInputSchema)
    .query(async ({ ctx, input }) => {
      const profiles = await ctx.db.query.DriverProfilesTable.findMany({
        where: driversWhere(input),
        with: { user: { columns: { name: true, phone: true } } },
        orderBy: driversOrderBy(input.sorting),
        limit: EXPORT_ROW_CAP,
      });

      const counts = await orderCountsFor(
        ctx.db,
        profiles.map((p) => p.userId),
      );

      return {
        rows: profiles.map((profile) => ({
          name: profile.user?.name ?? "",
          phone: profile.user?.phone ?? "",
          status: profile.status,
          vehicleType: profile.vehicleType,
          vehiclePlate: profile.vehiclePlate ?? "",
          isAvailable: profile.isAvailable,
          activeOrders: counts.get(profile.userId)?.active ?? 0,
          deliveredOrders: counts.get(profile.userId)?.delivered ?? 0,
          createdAt: profile.createdAt.toISOString(),
        })),
      };
    }),

  bulkSetStatus: adminProcedure
    .input(
      z.object({
        profileIds: z.array(z.uuid()).min(1).max(100),
        status: z.enum(["approved", "suspended"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(DriverProfilesTable)
        .set({
          status: input.status,
          ...(input.status === "suspended" ? { isAvailable: false } : {}),
          updatedBy: ctx.session.user.id,
        })
        .where(
          and(
            inArray(DriverProfilesTable.id, input.profileIds),
            isNull(DriverProfilesTable.deletedAt),
          ),
        );
      return { ok: true as const };
    }),

  /**
   * Admin-created drivers are approved immediately; if the phone belongs to
   * an existing customer it is converted (journey A3).
   */
  create: adminProcedure
    .input(
      z.object({
        phone: egyptianPhoneSchema,
        name: z.string().trim().min(2).max(100),
        vehicleType: z.enum(vehicleTypeValues).default("motorcycle"),
        vehiclePlate: z.string().trim().max(32).optional(),
        adminNotes: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.UsersTable.findFirst({
        where: and(eq(UsersTable.phone, input.phone), isNull(UsersTable.deletedAt)),
        with: { driverProfile: true },
      });

      let userId: string;
      if (existing) {
        if (existing.role === "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "admin.drivers.phoneIsAdmin" });
        }
        if (existing.driverProfile && !existing.driverProfile.deletedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "admin.drivers.alreadyDriver" });
        }
        // convert customer → driver; their sessions are stale role-wise, so drop them
        await ctx.db
          .update(UsersTable)
          .set({ role: "driver", name: input.name, updatedBy: ctx.session.user.id })
          .where(eq(UsersTable.id, existing.id));
        const { deleteAllSessionsForUser } = await import(
          "@workspace/auth/session"
        );
        await deleteAllSessionsForUser(existing.id);
        userId = existing.id;
      } else {
        const [created] = await ctx.db
          .insert(UsersTable)
          .values({
            phone: input.phone,
            name: input.name,
            role: "driver",
            createdBy: ctx.session.user.id,
          })
          .returning();
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        userId = created.id;
      }

      const [profile] = await ctx.db
        .insert(DriverProfilesTable)
        .values({
          userId,
          status: "approved",
          vehicleType: input.vehicleType,
          vehiclePlate: input.vehiclePlate,
          adminNotes: input.adminNotes,
          createdBy: ctx.session.user.id,
        })
        .returning();
      return profile;
    }),

  update: adminProcedure
    .input(
      z.object({
        profileId: z.uuid(),
        vehicleType: z.enum(vehicleTypeValues).optional(),
        vehiclePlate: z.string().trim().max(32).optional(),
        adminNotes: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { profileId, ...changes } = input;
      const [row] = await ctx.db
        .update(DriverProfilesTable)
        .set({ ...changes, updatedBy: ctx.session.user.id })
        .where(eq(DriverProfilesTable.id, profileId))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  setStatus: adminProcedure
    .input(
      z.object({
        profileId: z.uuid(),
        status: z.enum(["approved", "suspended"]),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.query.DriverProfilesTable.findFirst({
        where: eq(DriverProfilesTable.id, input.profileId),
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      // Suspension does NOT auto-unassign active orders — the UI warns and
      // the admin reassigns first (journey A3 §4).
      await ctx.db
        .update(DriverProfilesTable)
        .set({
          status: input.status,
          ...(input.note
            ? {
                adminNotes: profile.adminNotes
                  ? `${profile.adminNotes}\n${input.note}`
                  : input.note,
              }
            : {}),
          ...(input.status === "suspended" ? { isAvailable: false } : {}),
          updatedBy: ctx.session.user.id,
        })
        .where(eq(DriverProfilesTable.id, input.profileId));
      return { ok: true as const };
    }),
});
