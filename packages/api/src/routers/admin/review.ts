import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { ItemMergeSuggestionsTable } from "@workspace/db/schemas/catalog/item-merge-suggestions";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import { mergeItemInto, unmergeItem } from "@workspace/integrations/catalog/merge";
import { itemNameSchema } from "@workspace/validators/catalog";
import { normalizeText } from "@workspace/validators/normalize";

import { adminProcedure, createTRPCRouter } from "../../init";

/** Item review queue — the human end of the dedup pipeline (journey A5). */
export const adminReviewRouter = createTRPCRouter({
  queue: adminProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.query.ItemsTable.findMany({
      where: and(
        eq(ItemsTable.status, "pending_review"),
        isNull(ItemsTable.deletedAt),
      ),
      with: { category: true },
      orderBy: [asc(ItemsTable.createdAt)],
      limit: 50,
    });

    const withSuggestions = await Promise.all(
      items.map(async (item) => ({
        ...item,
        suggestions: await ctx.db.query.ItemMergeSuggestionsTable.findMany({
          where: and(
            eq(ItemMergeSuggestionsTable.newItemId, item.id),
            eq(ItemMergeSuggestionsTable.status, "pending"),
          ),
          with: { candidate: true },
          orderBy: (t, { desc }) => [desc(t.similarityScore)],
        }),
      })),
    );

    return withSuggestions;
  }),

  merge: adminProcedure
    .input(z.object({ itemId: z.uuid(), intoItemId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await mergeItemInto(
        ctx.db,
        input.itemId,
        input.intoItemId,
        ctx.session.user.id,
      );
      await ctx.db
        .update(ItemMergeSuggestionsTable)
        .set({
          status: "accepted",
          resolvedByUserId: ctx.session.user.id,
          updatedBy: ctx.session.user.id,
        })
        .where(eq(ItemMergeSuggestionsTable.newItemId, input.itemId));
      return { ok: true as const };
    }),

  approve: adminProcedure
    .input(
      z.object({
        itemId: z.uuid(),
        nameEn: itemNameSchema.optional(),
        nameAr: itemNameSchema.optional(),
        categoryId: z.uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(ItemsTable)
        .set({
          status: "approved",
          ...(input.nameEn
            ? { nameEn: input.nameEn, normalizedEn: normalizeText(input.nameEn) }
            : {}),
          ...(input.nameAr
            ? { nameAr: input.nameAr, normalizedAr: normalizeText(input.nameAr) }
            : {}),
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
          updatedBy: ctx.session.user.id,
        })
        .where(eq(ItemsTable.id, input.itemId))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(ItemMergeSuggestionsTable)
        .set({
          status: "rejected",
          resolvedByUserId: ctx.session.user.id,
          updatedBy: ctx.session.user.id,
        })
        .where(eq(ItemMergeSuggestionsTable.newItemId, input.itemId));
      return row;
    }),

  unmerge: adminProcedure
    .input(z.object({ itemId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await unmergeItem(ctx.db, input.itemId, ctx.session.user.id);
      return { ok: true as const };
    }),
});
