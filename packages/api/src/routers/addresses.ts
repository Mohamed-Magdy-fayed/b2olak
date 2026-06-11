import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

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

export const addressesRouter = createTRPCRouter({
  list: customerProcedure.query(({ ctx }) =>
    ctx.db.query.AddressesTable.findMany({
      where: and(
        eq(AddressesTable.userId, ctx.session.user.id),
        isNull(AddressesTable.deletedAt),
      ),
      orderBy: [desc(AddressesTable.isDefault), desc(AddressesTable.createdAt)],
    }),
  ),

  create: customerProcedure
    .input(addressUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.isDefault) {
        await ctx.db
          .update(AddressesTable)
          .set({ isDefault: false })
          .where(eq(AddressesTable.userId, ctx.session.user.id));
      }
      const [row] = await ctx.db
        .insert(AddressesTable)
        .values({
          ...input,
          userId: ctx.session.user.id,
          createdBy: ctx.session.user.id,
        })
        .returning();
      return row;
    }),

  update: customerProcedure
    .input(addressUpsertSchema.partial().extend({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;
      if (changes.isDefault) {
        await ctx.db
          .update(AddressesTable)
          .set({ isDefault: false })
          .where(eq(AddressesTable.userId, ctx.session.user.id));
      }
      const [row] = await ctx.db
        .update(AddressesTable)
        .set({ ...changes, updatedBy: ctx.session.user.id })
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
