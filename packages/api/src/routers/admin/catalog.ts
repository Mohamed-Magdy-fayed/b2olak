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
} from "drizzle-orm";
import { z } from "zod";

import { CategoriesTable } from "@workspace/db/schemas/catalog/categories";
import {
  ItemsTable,
  itemSourceValues,
  itemStatusValues,
  itemUnitValues,
} from "@workspace/db/schemas/catalog/items";
import {
  ImageValidationError,
  uploadImage,
} from "@workspace/integrations/firebase/storage";
import { invalidate } from "@workspace/integrations/redis";
import {
  adminItemUpsertSchema,
  categoryUpsertSchema,
  uploadImageSchema,
} from "@workspace/validators/catalog";
import { normalizeText } from "@workspace/validators/normalize";

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

function itemsWhere(input: {
  columnFilters: { id: string; value: unknown }[];
  globalFilter?: string;
}): SQL | undefined {
  const conditions: (SQL | undefined)[] = [isNull(ItemsTable.deletedAt)];

  for (const filter of input.columnFilters) {
    if (filter.id === "category") {
      const ids = Array.isArray(filter.value)
        ? filter.value.map(String).filter(Boolean)
        : [];
      if (ids.length) conditions.push(inArray(ItemsTable.categoryId, ids));
    } else if (filter.id === "status") {
      const values = facetValues(filter.value, itemStatusValues);
      if (values.length) conditions.push(inArray(ItemsTable.status, values));
    } else if (filter.id === "defaultUnit") {
      const values = facetValues(filter.value, itemUnitValues);
      if (values.length) {
        conditions.push(inArray(ItemsTable.defaultUnit, values));
      }
    } else if (filter.id === "source") {
      const values = facetValues(filter.value, itemSourceValues);
      if (values.length) conditions.push(inArray(ItemsTable.source, values));
    } else if (filter.id === "createdAt" && isDateRangeValue(filter.value)) {
      const { from, to } = dateBounds(filter.value);
      if (from) conditions.push(gte(ItemsTable.createdAt, from));
      if (to) conditions.push(lte(ItemsTable.createdAt, to));
    }
  }

  const q = input.globalFilter ? normalizeText(input.globalFilter) : "";
  if (q) {
    conditions.push(
      or(
        ilike(ItemsTable.normalizedEn, `%${q}%`),
        ilike(ItemsTable.normalizedAr, `%${q}%`),
      ),
    );
  }

  return and(...conditions);
}

const ITEM_SORTABLE = {
  nameEn: ItemsTable.nameEn,
  nameAr: ItemsTable.nameAr,
  status: ItemsTable.status,
  createdAt: ItemsTable.createdAt,
} as const;

function itemsOrderBy(sorting: { id: string; desc: boolean }[]) {
  const explicit = sorting
    .filter((s): s is { id: keyof typeof ITEM_SORTABLE; desc: boolean } =>
      s.id in ITEM_SORTABLE,
    )
    .map((s) => (s.desc ? desc(ITEM_SORTABLE[s.id]) : asc(ITEM_SORTABLE[s.id])));
  return explicit.length ? explicit : [desc(ItemsTable.createdAt)];
}

const importItemRowSchema = z.object({
  nameEn: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(2).max(80),
  categorySlug: z.string().trim().min(1).max(128),
  unit: z.enum(itemUnitValues).default("piece"),
});

const importCategoryRowSchema = z.object({
  nameEn: z.string().trim().min(2).max(128),
  nameAr: z.string().trim().min(2).max(128),
  slug: z.string().trim().min(1).max(128),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

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

    /** Bulk import — upsert by slug. */
    importRows: adminProcedure
      .input(
        z.object({ rows: z.array(importCategoryRowSchema).min(1).max(200) }),
      )
      .mutation(async ({ ctx, input }) => {
        const results: { index: number; action: "created" | "updated" }[] = [];

        for (const [index, row] of input.rows.entries()) {
          const existing = await ctx.db.query.CategoriesTable.findFirst({
            where: and(
              eq(CategoriesTable.slug, row.slug),
              isNull(CategoriesTable.deletedAt),
            ),
          });
          if (existing) {
            await ctx.db
              .update(CategoriesTable)
              .set({
                nameEn: row.nameEn,
                nameAr: row.nameAr,
                sortOrder: row.sortOrder,
                updatedBy: ctx.session.user.id,
              })
              .where(eq(CategoriesTable.id, existing.id));
            results.push({ index, action: "updated" });
          } else {
            await ctx.db.insert(CategoriesTable).values({
              nameEn: row.nameEn,
              nameAr: row.nameAr,
              slug: row.slug,
              sortOrder: row.sortOrder,
              createdBy: ctx.session.user.id,
            });
            results.push({ index, action: "created" });
          }
        }

        await invalidateCatalogCache();
        return { results };
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
          .update(CategoriesTable)
          .set({ isActive: input.isActive, updatedBy: ctx.session.user.id })
          .where(
            and(
              inArray(CategoriesTable.id, input.ids),
              isNull(CategoriesTable.deletedAt),
            ),
          );
        await invalidateCatalogCache();
        return { ok: true as const };
      }),

    bulkDelete: adminProcedure
      .input(z.object({ ids: z.array(z.uuid()).min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(CategoriesTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(
            and(
              inArray(CategoriesTable.id, input.ids),
              isNull(CategoriesTable.deletedAt),
            ),
          );
        await invalidateCatalogCache();
        return { ok: true as const };
      }),
  }),

  items: createTRPCRouter({
    list: adminProcedure
      .input(tableListInputSchema)
      .query(async ({ ctx, input }) => {
        const where = itemsWhere(input);

        const [{ value: total } = { value: 0 }] = await ctx.db
          .select({ value: count() })
          .from(ItemsTable)
          .where(where);

        const { pageCount, offset } = pageMath(
          total,
          input.page,
          input.perPage,
        );

        const rows = await ctx.db.query.ItemsTable.findMany({
          where,
          with: { category: true },
          orderBy: itemsOrderBy(input.sorting),
          offset,
          limit: input.perPage,
        });

        return { rows, pageCount, total };
      }),

    exportRows: adminProcedure
      .input(tableExportInputSchema)
      .query(async ({ ctx, input }) => {
        const rows = await ctx.db.query.ItemsTable.findMany({
          where: itemsWhere(input),
          with: { category: { columns: { slug: true } } },
          orderBy: itemsOrderBy(input.sorting),
          limit: EXPORT_ROW_CAP,
        });

        return {
          rows: rows.map((item) => ({
            nameEn: item.nameEn,
            nameAr: item.nameAr,
            categorySlug: item.category?.slug ?? "",
            unit: item.defaultUnit,
            status: item.status,
            source: item.source,
            createdAt: item.createdAt.toISOString(),
          })),
        };
      }),

    /** Bulk catalog import — upsert by normalized Arabic name within category. */
    importRows: adminProcedure
      .input(z.object({ rows: z.array(importItemRowSchema).min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const categories = await ctx.db.query.CategoriesTable.findMany({
          where: isNull(CategoriesTable.deletedAt),
          columns: { id: true, slug: true },
        });
        const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

        const results: { index: number; action: "created" | "updated" | "error"; message?: string }[] = [];

        for (const [index, row] of input.rows.entries()) {
          const categoryId = categoryBySlug.get(row.categorySlug);
          if (!categoryId) {
            results.push({
              index,
              action: "error",
              message: "dataTable.importReasonUnknownCategory",
            });
            continue;
          }
          const normalizedAr = normalizeText(row.nameAr);
          const existing = await ctx.db.query.ItemsTable.findFirst({
            where: and(
              eq(ItemsTable.categoryId, categoryId),
              eq(ItemsTable.normalizedAr, normalizedAr),
              isNull(ItemsTable.deletedAt),
            ),
          });
          if (existing) {
            await ctx.db
              .update(ItemsTable)
              .set({
                nameEn: row.nameEn,
                nameAr: row.nameAr,
                normalizedEn: normalizeText(row.nameEn),
                normalizedAr,
                defaultUnit: row.unit,
                updatedBy: ctx.session.user.id,
              })
              .where(eq(ItemsTable.id, existing.id));
            results.push({ index, action: "updated" });
          } else {
            await ctx.db.insert(ItemsTable).values({
              categoryId,
              nameEn: row.nameEn,
              nameAr: row.nameAr,
              normalizedEn: normalizeText(row.nameEn),
              normalizedAr,
              defaultUnit: row.unit,
              status: "approved",
              source: "admin",
              createdByUserId: ctx.session.user.id,
              createdBy: ctx.session.user.id,
            });
            results.push({ index, action: "created" });
          }
        }

        return { results };
      }),

    bulkApprove: adminProcedure
      .input(z.object({ ids: z.array(z.uuid()).min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(ItemsTable)
          .set({ status: "approved", updatedBy: ctx.session.user.id })
          .where(
            and(
              inArray(ItemsTable.id, input.ids),
              eq(ItemsTable.status, "pending_review"),
              isNull(ItemsTable.deletedAt),
            ),
          );
        return { ok: true as const };
      }),

    bulkDelete: adminProcedure
      .input(z.object({ ids: z.array(z.uuid()).min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(ItemsTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(
            and(inArray(ItemsTable.id, input.ids), isNull(ItemsTable.deletedAt)),
          );
        return { ok: true as const };
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
