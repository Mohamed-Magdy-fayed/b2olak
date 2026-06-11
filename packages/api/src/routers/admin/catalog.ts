import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { CategoriesTable } from "@workspace/db/schemas/catalog/categories";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import {
  ImageValidationError,
  uploadImage,
} from "@workspace/integrations/firebase/storage";
import { invalidate } from "@workspace/integrations/redis";
import {
  adminItemsListSchema,
  adminItemUpsertSchema,
  categoryUpsertSchema,
  uploadImageSchema,
} from "@workspace/validators/catalog";
import { normalizeText } from "@workspace/validators/normalize";

import { adminProcedure, createTRPCRouter } from "../../init";

async function invalidateCatalogCache() {
  try {
    await invalidate("catalog:categories");
  } catch {
    // cache invalidation is best-effort
  }
}

export const adminCatalogRouter = createTRPCRouter({
  uploadImage: adminProcedure
    .input(uploadImageSchema)
    .mutation(async ({ input }) => {
      try {
        const url = await uploadImage(input.base64, input.mimeType, input.folder);
        return { url };
      } catch (error) {
        if (error instanceof ImageValidationError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        throw error;
      }
    }),

  categories: createTRPCRouter({
    list: adminProcedure.query(({ ctx }) =>
      ctx.db.query.CategoriesTable.findMany({
        where: isNull(CategoriesTable.deletedAt),
        orderBy: [asc(CategoriesTable.sortOrder)],
      }),
    ),

    create: adminProcedure
      .input(categoryUpsertSchema)
      .mutation(async ({ ctx, input }) => {
        const [row] = await ctx.db
          .insert(CategoriesTable)
          .values({ ...input, createdBy: ctx.session.user.id })
          .returning();
        await invalidateCatalogCache();
        return row;
      }),

    update: adminProcedure
      .input(categoryUpsertSchema.partial().extend({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...changes } = input;
        const [row] = await ctx.db
          .update(CategoriesTable)
          .set({ ...changes, updatedBy: ctx.session.user.id })
          .where(eq(CategoriesTable.id, id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        await invalidateCatalogCache();
        return row;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(CategoriesTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(eq(CategoriesTable.id, input.id));
        await invalidateCatalogCache();
        return { ok: true as const };
      }),
  }),

  items: createTRPCRouter({
    list: adminProcedure
      .input(adminItemsListSchema)
      .query(async ({ ctx, input }) => {
        const search = input.search ? normalizeText(input.search) : undefined;

        const where = and(
          isNull(ItemsTable.deletedAt),
          input.categoryId ? eq(ItemsTable.categoryId, input.categoryId) : undefined,
          input.status ? eq(ItemsTable.status, input.status) : undefined,
          search
            ? or(
                ilike(ItemsTable.normalizedEn, `%${search}%`),
                ilike(ItemsTable.normalizedAr, `%${search}%`),
              )
            : undefined,
        );

        const [items, [count]] = await Promise.all([
          ctx.db.query.ItemsTable.findMany({
            where,
            with: { category: true },
            orderBy: [desc(ItemsTable.createdAt)],
            offset: input.cursor,
            limit: input.limit + 1,
          }),
          ctx.db
            .select({ total: sql<number>`count(*)::int` })
            .from(ItemsTable)
            .where(where),
        ]);

        const hasMore = items.length > input.limit;
        return {
          items: hasMore ? items.slice(0, input.limit) : items,
          nextCursor: hasMore ? input.cursor + input.limit : null,
          total: count?.total ?? 0,
        };
      }),

    create: adminProcedure
      .input(adminItemUpsertSchema)
      .mutation(async ({ ctx, input }) => {
        const [row] = await ctx.db
          .insert(ItemsTable)
          .values({
            ...input,
            normalizedEn: normalizeText(input.nameEn),
            normalizedAr: normalizeText(input.nameAr),
            status: "approved",
            source: "admin",
            createdByUserId: ctx.session.user.id,
            createdBy: ctx.session.user.id,
          })
          .returning();
        return row;
      }),

    update: adminProcedure
      .input(adminItemUpsertSchema.partial().extend({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...changes } = input;
        const [row] = await ctx.db
          .update(ItemsTable)
          .set({
            ...changes,
            ...(changes.nameEn
              ? { normalizedEn: normalizeText(changes.nameEn) }
              : {}),
            ...(changes.nameAr
              ? { normalizedAr: normalizeText(changes.nameAr) }
              : {}),
            updatedBy: ctx.session.user.id,
          })
          .where(eq(ItemsTable.id, id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(ItemsTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(eq(ItemsTable.id, input.id));
        return { ok: true as const };
      }),
  }),
});
