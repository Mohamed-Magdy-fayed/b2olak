import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { UsersTable } from "@workspace/db/schemas/auth/users";
import {
  DriverProfilesTable,
  vehicleTypeValues,
} from "@workspace/db/schemas/drivers/driver-profiles";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { egyptianPhoneSchema } from "@workspace/validators/auth";

import { adminProcedure, createTRPCRouter } from "../../init";

export const adminDriversRouter = createTRPCRouter({
  list: adminProcedure.query(async ({ ctx }) => {
    const profiles = await ctx.db.query.DriverProfilesTable.findMany({
      where: isNull(DriverProfilesTable.deletedAt),
      with: {
        user: { columns: { id: true, name: true, phone: true, status: true } },
      },
      orderBy: [desc(DriverProfilesTable.createdAt)],
    });

    return Promise.all(
      profiles.map(async (profile) => {
        const [counts] = await ctx.db
          .select({
            active: sql<number>`count(*) filter (where ${OrdersTable.status} in ('assigned','shopping','purchased','delivering'))::int`,
            delivered: sql<number>`count(*) filter (where ${OrdersTable.status} = 'delivered')::int`,
          })
          .from(OrdersTable)
          .where(eq(OrdersTable.driverId, profile.userId));
        return {
          ...profile,
          activeOrders: counts?.active ?? 0,
          deliveredOrders: counts?.delivered ?? 0,
        };
      }),
    );
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
