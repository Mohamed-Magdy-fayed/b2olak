import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import type { Db } from "@workspace/db/client";
import { AreasTable } from "@workspace/db/schemas/geo/areas";
import { AddressesTable } from "@workspace/db/schemas/orders/addresses";
import { addressUpsertSchema } from "@workspace/validators/addresses";

import { createTRPCRouter, customerProcedure } from "../init";

function ownedAddress(userId: string, addressId: string) {
  return and(
    eq(AddressesTable.id, addressId),
    eq(AddressesTable.userId, userId),
    isNull(AddressesTable.deletedAt),
  );
}

/**
 * Validates the geo chain (area → district → city, all active) and resolves
 * the Arabic name snapshots stored on the address row. Snapshots are the
 * operational ground truth riders navigate by; localized display joins the
 * geo relations instead.
 */
async function resolveGeoChain(
  db: Db,
  input: { cityId: string; districtId: string; areaId: string },
) {
  const area = await db.query.AreasTable.findFirst({
    where: and(
      eq(AreasTable.id, input.areaId),
      eq(AreasTable.isActive, true),
      isNull(AreasTable.deletedAt),
    ),
    with: { district: { with: { city: true } } },
  });

  const district = area?.district;
  const city = district?.city;
  const chainValid =
    !!area &&
    !!district &&
    !!city &&
    district.id === input.districtId &&
    district.isActive &&
    district.deletedAt === null &&
    city.id === input.cityId &&
    city.isActive &&
    city.deletedAt === null;

  if (!chainValid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "address.invalidGeoSelection",
    });
  }

  return {
    cityId: city.id,
    districtId: district.id,
    areaId: area.id,
    city: city.nameAr,
    area: district.nameAr,
    street: area.nameAr,
  };
}

export const addressesRouter = createTRPCRouter({
  list: customerProcedure.query(({ ctx }) =>
    ctx.db.query.AddressesTable.findMany({
      where: and(
        eq(AddressesTable.userId, ctx.session.user.id),
        isNull(AddressesTable.deletedAt),
      ),
      with: { cityRef: true, districtRef: true, areaRef: true },
      orderBy: [desc(AddressesTable.isDefault), desc(AddressesTable.createdAt)],
    }),
  ),

  create: customerProcedure
    .input(addressUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const { cityId, districtId, areaId, ...rest } = input;
      const geo = await resolveGeoChain(ctx.db, { cityId, districtId, areaId });

      if (input.isDefault) {
        await ctx.db
          .update(AddressesTable)
          .set({ isDefault: false })
          .where(eq(AddressesTable.userId, ctx.session.user.id));
      }
      const [row] = await ctx.db
        .insert(AddressesTable)
        .values({
          ...rest,
          ...geo,
          userId: ctx.session.user.id,
          createdBy: ctx.session.user.id,
        })
        .returning();
      return row;
    }),

  update: customerProcedure
    .input(addressUpsertSchema.partial().extend({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, cityId, districtId, areaId, ...changes } = input;

      // The geo chain is all-or-nothing: re-resolve snapshots when it changes.
      const geoTouched =
        cityId !== undefined || districtId !== undefined || areaId !== undefined;
      let geo: Awaited<ReturnType<typeof resolveGeoChain>> | undefined;
      if (geoTouched) {
        if (!cityId || !districtId || !areaId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "address.invalidGeoSelection",
          });
        }
        geo = await resolveGeoChain(ctx.db, { cityId, districtId, areaId });
      }

      if (changes.isDefault) {
        await ctx.db
          .update(AddressesTable)
          .set({ isDefault: false })
          .where(eq(AddressesTable.userId, ctx.session.user.id));
      }
      const [row] = await ctx.db
        .update(AddressesTable)
        .set({ ...changes, ...(geo ?? {}), updatedBy: ctx.session.user.id })
        .where(ownedAddress(ctx.session.user.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  delete: customerProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(AddressesTable)
        .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
        .where(ownedAddress(ctx.session.user.id, input.id));
      return { ok: true as const };
    }),
});
