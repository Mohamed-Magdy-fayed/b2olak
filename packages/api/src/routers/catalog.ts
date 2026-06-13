import { and, asc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";

import { CategoriesTable } from "@workspace/db/schemas/catalog/categories";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import { cached } from "@workspace/integrations/redis";
import { normalizeText } from "@workspace/validators/normalize";

import { baseProcedure, createTRPCRouter } from "../init";
import { enforceRateLimit, ipFromHeaders } from "../ratelimit";

/** Public catalog reads — consumed by mobile (P6) and the admin item pickers. */

const visibleItem = and(
  isNull(ItemsTable.deletedAt),
  ne(ItemsTable.status, "merged"),
);

export const catalogRouter = createTRPCRouter({
  /** Public so the checkout screen can show the fee before placing. */
  deliveryFee: baseProcedure.query(async ({ ctx }) => {
    const { getDeliveryFeeEgp } = await import("../lib/settings");
    return { amount: await getDeliveryFeeEgp(ctx.db) };
  }),

  /** Public store links — shown on the landing page download section. */
  storeLinks: baseProcedure.query(({ ctx }) =>
    cached("catalog:store-links", 60, async () => {
      const { getStoreLinks } = await import("../lib/settings");
      return getStoreLinks(ctx.db);
    }),
  ),

  categories: baseProcedure.query(({ ctx }) =>
    cached("catalog:categories", 60, () =>
      ctx.db.query.CategoriesTable.findMany({
        where: and(
          eq(CategoriesTable.isActive, true),
          isNull(CategoriesTable.deletedAt),
        ),
        orderBy: [asc(CategoriesTable.sortOrder)],
      }),
    ),
  ),

  itemsByCategory: baseProcedure
    .input(
      z.object({
        categoryId: z.uuid(),
        cursor: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.ItemsTable.findMany({
        where: and(eq(ItemsTable.categoryId, input.categoryId), visibleItem),
        orderBy: [asc(ItemsTable.nameAr)],
        offset: input.cursor,
        limit: input.limit + 1,
      });

      const hasMore = items.length > input.limit;
      return {
        items: hasMore ? items.slice(0, input.limit) : items,
        nextCursor: hasMore ? input.cursor + input.limit : null,
      };
    }),

  search: baseProcedure
    .input(z.object({ query: z.string().trim().min(1).max(80) }))
    .query(async ({ ctx, input }) => {
      await enforceRateLimit("search", ipFromHeaders(ctx.headers), 60, "1 m");

      const normalized = normalizeText(input.query);
      if (!normalized) return { items: [] };

      // Substring match on normalized columns for now; pg_trgm similarity
      // ranking lands with the dedup pipeline (P7).
      const items = await ctx.db.query.ItemsTable.findMany({
        where: and(
          visibleItem,
          or(
            ilike(ItemsTable.normalizedEn, `%${normalized}%`),
            ilike(ItemsTable.normalizedAr, `%${normalized}%`),
          ),
        ),
        orderBy: [asc(ItemsTable.nameAr)],
        limit: 30,
      });

      return { items };
    }),
});
