import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { ItemUnitsTable } from "@workspace/db/schemas/catalog/item-units";
import { UnitsTable } from "@workspace/db/schemas/catalog/units";
import { unitUpsertSchema } from "@workspace/validators/catalog";

import { adminProcedure, createTRPCRouter } from "../../init";

type Db = typeof import("@workspace/db/client").db;

/** Reject deleting a unit that is still linked to any item. */
async function assertNotInUse(db: Db, unitIds: string[]) {
  const [{ value } = { value: 0 }] = await db
    .select({ value: count() })
    .from(ItemUnitsTable)
    .where(inArray(ItemUnitsTable.unitId, unitIds));
  if (value > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "admin.units.deleteInUse",
    });
  }
}

export const adminUnitsRouter = createTRPCRouter({
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.query.UnitsTable.findMany({
      where: isNull(UnitsTable.deletedAt),
      orderBy: [asc(UnitsTable.sortOrder)],
    }),
  ),

  create: adminProcedure
    .input(unitUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(UnitsTable)
        .values({ ...input, createdBy: ctx.session.user.id })
        .returning();
      return row;
    }),

  update: adminProcedure
    .input(unitUpsertSchema.partial().extend({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;
      const [row] = await ctx.db
        .update(UnitsTable)
        .set({ ...changes, updatedBy: ctx.session.user.id })
        .where(eq(UnitsTable.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertNotInUse(ctx.db, [input.id]);
      await ctx.db
        .update(UnitsTable)
        .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
        .where(eq(UnitsTable.id, input.id));
      return { ok: true as const };
    }),

  bulkSetActive: adminProcedure
    .input(
      z.object({
        ids: z.array(z.uuid()).min(1).max(200),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(UnitsTable)
        .set({ isActive: input.isActive, updatedBy: ctx.session.user.id })
        .where(
          and(inArray(UnitsTable.id, input.ids), isNull(UnitsTable.deletedAt)),
        );
      return { ok: true as const };
    }),

  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.uuid()).min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await assertNotInUse(ctx.db, input.ids);
      await ctx.db
        .update(UnitsTable)
        .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
        .where(
          and(inArray(UnitsTable.id, input.ids), isNull(UnitsTable.deletedAt)),
        );
      return { ok: true as const };
    }),
});
