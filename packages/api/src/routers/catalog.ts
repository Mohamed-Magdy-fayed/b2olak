import { and, asc, count, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import { CategoriesTable } from "@workspace/db/schemas/catalog/categories";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import { OrderItemsTable } from "@workspace/db/schemas/orders/order-items";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { cached } from "@workspace/integrations/redis";
import { normalizeText } from "@workspace/validators/normalize";

import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
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

  /**
   * Top 12 items by total order frequency — cached ~5 min.
   * Returns [] when order_items is empty.
   */
  popularItems: baseProcedure.query(({ ctx }) =>
    cached("catalog:popular-items", 300, async () => {
      const rows = await ctx.db
        .select({
          id: ItemsTable.id,
          nameEn: ItemsTable.nameEn,
          nameAr: ItemsTable.nameAr,
          imageUrl: ItemsTable.imageUrl,
          defaultUnit: ItemsTable.defaultUnit,
          categoryId: ItemsTable.categoryId,
          orderCount: count(OrderItemsTable.id).as("orderCount"),
        })
        .from(OrderItemsTable)
        .innerJoin(ItemsTable, eq(OrderItemsTable.itemId, ItemsTable.id))
        .where(and(isNull(ItemsTable.deletedAt), ne(ItemsTable.status, "merged"), eq(ItemsTable.status, "approved")))
        .groupBy(
          ItemsTable.id,
          ItemsTable.nameEn,
          ItemsTable.nameAr,
          ItemsTable.imageUrl,
          ItemsTable.defaultUnit,
          ItemsTable.categoryId,
        )
        .orderBy(desc(sql`"orderCount"`))
        .limit(12);

      return rows.map(({ orderCount: _oc, ...item }) => item);
    }),
  ),

  /**
   * Items the current user has ordered before — distinct, most-recent-order
   * first, limit 12. Not cached (user-specific).
   */
  reorderItems: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Subquery to get the most recent order date per item for this user
    const rows = await ctx.db
      .selectDistinctOn([ItemsTable.id], {
        id: ItemsTable.id,
        nameEn: ItemsTable.nameEn,
        nameAr: ItemsTable.nameAr,
        imageUrl: ItemsTable.imageUrl,
        defaultUnit: ItemsTable.defaultUnit,
        categoryId: ItemsTable.categoryId,
        lastOrderedAt: OrdersTable.createdAt,
      })
      .from(OrdersTable)
      .innerJoin(OrderItemsTable, eq(OrderItemsTable.orderId, OrdersTable.id))
      .innerJoin(ItemsTable, eq(OrderItemsTable.itemId, ItemsTable.id))
      .where(
        and(
          eq(OrdersTable.customerId, userId),
          isNull(ItemsTable.deletedAt),
          ne(ItemsTable.status, "merged"),
          eq(ItemsTable.status, "approved"),
        ),
      )
      .orderBy(ItemsTable.id, desc(OrdersTable.createdAt))
      .limit(12);

    // Sort by most-recently-ordered
    rows.sort((a, b) => {
      if (!a.lastOrderedAt) return 1;
      if (!b.lastOrderedAt) return -1;
      return b.lastOrderedAt.getTime() - a.lastOrderedAt.getTime();
    });

    return rows.map(({ lastOrderedAt: _la, ...item }) => item);
  }),
});
