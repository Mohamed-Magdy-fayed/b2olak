import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { AreasTable } from "@workspace/db/schemas/geo/areas";
import { CitiesTable } from "@workspace/db/schemas/geo/cities";
import { DistrictsTable } from "@workspace/db/schemas/geo/districts";

import { adminProcedure, createTRPCRouter } from "../../init";

const geoNameSchema = z.object({
  nameEn: z.string().min(2).max(128),
  nameAr: z.string().min(2).max(128),
  sortOrder: z.int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const geoImportRowSchema = z.object({
  nameEn: z.string().trim().min(2).max(128),
  nameAr: z.string().trim().min(2).max(128),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const bulkIdsSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200) });
const bulkActiveSchema = bulkIdsSchema.extend({ isActive: z.boolean() });

export const adminGeoRouter = createTRPCRouter({
  /**
   * Full coverage tree (cities → districts → areas) for the expandable
   * admin table. Returns all non-deleted rows regardless of active state.
   */
  tree: adminProcedure.query(({ ctx }) =>
    ctx.db.query.CitiesTable.findMany({
      where: isNull(CitiesTable.deletedAt),
      orderBy: [asc(CitiesTable.sortOrder), asc(CitiesTable.nameAr)],
      with: {
        districts: {
          where: (d, { isNull: dIsNull }) => dIsNull(d.deletedAt),
          orderBy: (d, { asc: dAsc }) => [dAsc(d.sortOrder), dAsc(d.nameAr)],
          with: {
            areas: {
              where: (a, { isNull: aIsNull }) => aIsNull(a.deletedAt),
              orderBy: (a, { asc: aAsc }) => [aAsc(a.sortOrder), aAsc(a.nameAr)],
            },
          },
        },
      },
    }),
  ),

  cities: createTRPCRouter({
    list: adminProcedure.query(async ({ ctx }) => {
      const cities = await ctx.db.query.CitiesTable.findMany({
        where: isNull(CitiesTable.deletedAt),
        orderBy: [asc(CitiesTable.sortOrder), asc(CitiesTable.nameAr)],
      });

      const counts = await ctx.db
        .select({
          cityId: DistrictsTable.cityId,
          count: sql<number>`count(*)::int`,
        })
        .from(DistrictsTable)
        .where(isNull(DistrictsTable.deletedAt))
        .groupBy(DistrictsTable.cityId);

      const countMap = new Map(counts.map((r) => [r.cityId, r.count]));

      return cities.map((city) => ({
        ...city,
        districtCount: countMap.get(city.id) ?? 0,
      }));
    }),

    create: adminProcedure.input(geoNameSchema).mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(CitiesTable)
        .values({ ...input, createdBy: ctx.session.user.id })
        .returning();
      return row;
    }),

    update: adminProcedure
      .input(geoNameSchema.partial().extend({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...changes } = input;
        const [row] = await ctx.db
          .update(CitiesTable)
          .set({ ...changes, updatedBy: ctx.session.user.id })
          .where(and(eq(CitiesTable.id, id), isNull(CitiesTable.deletedAt)))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(CitiesTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(eq(CitiesTable.id, input.id));
        return { ok: true as const };
      }),

    /** CSV import — upsert by nameEn. */
    importRows: adminProcedure
      .input(z.object({ rows: z.array(geoImportRowSchema).min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        const results: { index: number; action: "created" | "updated" }[] = [];
        for (const [index, row] of input.rows.entries()) {
          const existing = await ctx.db.query.CitiesTable.findFirst({
            where: and(
              eq(CitiesTable.nameEn, row.nameEn),
              isNull(CitiesTable.deletedAt),
            ),
          });
          if (existing) {
            await ctx.db
              .update(CitiesTable)
              .set({
                nameAr: row.nameAr,
                sortOrder: row.sortOrder,
                updatedBy: ctx.session.user.id,
              })
              .where(eq(CitiesTable.id, existing.id));
            results.push({ index, action: "updated" });
          } else {
            await ctx.db.insert(CitiesTable).values({
              ...row,
              createdBy: ctx.session.user.id,
            });
            results.push({ index, action: "created" });
          }
        }
        return { results };
      }),

    bulkSetActive: adminProcedure
      .input(bulkActiveSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(CitiesTable)
          .set({ isActive: input.isActive, updatedBy: ctx.session.user.id })
          .where(
            and(inArray(CitiesTable.id, input.ids), isNull(CitiesTable.deletedAt)),
          );
        return { ok: true as const };
      }),

    bulkDelete: adminProcedure
      .input(bulkIdsSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(CitiesTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(
            and(inArray(CitiesTable.id, input.ids), isNull(CitiesTable.deletedAt)),
          );
        return { ok: true as const };
      }),
  }),

  districts: createTRPCRouter({
    list: adminProcedure
      .input(z.object({ cityId: z.uuid() }))
      .query(async ({ ctx, input }) => {
        const districts = await ctx.db.query.DistrictsTable.findMany({
          where: and(
            eq(DistrictsTable.cityId, input.cityId),
            isNull(DistrictsTable.deletedAt),
          ),
          orderBy: [asc(DistrictsTable.sortOrder), asc(DistrictsTable.nameAr)],
        });

        if (districts.length === 0) return [];

        const districtIds = districts.map((d) => d.id);
        const counts = await ctx.db
          .select({
            districtId: AreasTable.districtId,
            count: sql<number>`count(*)::int`,
          })
          .from(AreasTable)
          .where(
            and(
              isNull(AreasTable.deletedAt),
              sql`${AreasTable.districtId} = ANY(ARRAY[${sql.join(
                districtIds.map((id) => sql`${id}::uuid`),
                sql`, `,
              )}]::uuid[])`,
            ),
          )
          .groupBy(AreasTable.districtId);

        const countMap = new Map(counts.map((r) => [r.districtId, r.count]));

        return districts.map((district) => ({
          ...district,
          areaCount: countMap.get(district.id) ?? 0,
        }));
      }),

    create: adminProcedure
      .input(geoNameSchema.extend({ cityId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        const [row] = await ctx.db
          .insert(DistrictsTable)
          .values({ ...input, createdBy: ctx.session.user.id })
          .returning();
        return row;
      }),

    update: adminProcedure
      .input(geoNameSchema.partial().extend({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...changes } = input;
        const [row] = await ctx.db
          .update(DistrictsTable)
          .set({ ...changes, updatedBy: ctx.session.user.id })
          .where(
            and(eq(DistrictsTable.id, id), isNull(DistrictsTable.deletedAt)),
          )
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(DistrictsTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(eq(DistrictsTable.id, input.id));
        return { ok: true as const };
      }),

    /** CSV import into the selected city — upsert by nameEn within the city. */
    importRows: adminProcedure
      .input(
        z.object({
          cityId: z.uuid(),
          rows: z.array(geoImportRowSchema).min(1).max(200),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const results: { index: number; action: "created" | "updated" }[] = [];
        for (const [index, row] of input.rows.entries()) {
          const existing = await ctx.db.query.DistrictsTable.findFirst({
            where: and(
              eq(DistrictsTable.cityId, input.cityId),
              eq(DistrictsTable.nameEn, row.nameEn),
              isNull(DistrictsTable.deletedAt),
            ),
          });
          if (existing) {
            await ctx.db
              .update(DistrictsTable)
              .set({
                nameAr: row.nameAr,
                sortOrder: row.sortOrder,
                updatedBy: ctx.session.user.id,
              })
              .where(eq(DistrictsTable.id, existing.id));
            results.push({ index, action: "updated" });
          } else {
            await ctx.db.insert(DistrictsTable).values({
              ...row,
              cityId: input.cityId,
              createdBy: ctx.session.user.id,
            });
            results.push({ index, action: "created" });
          }
        }
        return { results };
      }),

    bulkSetActive: adminProcedure
      .input(bulkActiveSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(DistrictsTable)
          .set({ isActive: input.isActive, updatedBy: ctx.session.user.id })
          .where(
            and(
              inArray(DistrictsTable.id, input.ids),
              isNull(DistrictsTable.deletedAt),
            ),
          );
        return { ok: true as const };
      }),

    bulkDelete: adminProcedure
      .input(bulkIdsSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(DistrictsTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(
            and(
              inArray(DistrictsTable.id, input.ids),
              isNull(DistrictsTable.deletedAt),
            ),
          );
        return { ok: true as const };
      }),
  }),

  areas: createTRPCRouter({
    list: adminProcedure
      .input(z.object({ districtId: z.uuid() }))
      .query(({ ctx, input }) =>
        ctx.db.query.AreasTable.findMany({
          where: and(
            eq(AreasTable.districtId, input.districtId),
            isNull(AreasTable.deletedAt),
          ),
          orderBy: [asc(AreasTable.sortOrder), asc(AreasTable.nameAr)],
        }),
      ),

    create: adminProcedure
      .input(geoNameSchema.extend({ districtId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        const [row] = await ctx.db
          .insert(AreasTable)
          .values({ ...input, createdBy: ctx.session.user.id })
          .returning();
        return row;
      }),

    update: adminProcedure
      .input(geoNameSchema.partial().extend({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...changes } = input;
        const [row] = await ctx.db
          .update(AreasTable)
          .set({ ...changes, updatedBy: ctx.session.user.id })
          .where(and(eq(AreasTable.id, id), isNull(AreasTable.deletedAt)))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(AreasTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(eq(AreasTable.id, input.id));
        return { ok: true as const };
      }),

    /** CSV import into the selected district — upsert by nameEn within it. */
    importRows: adminProcedure
      .input(
        z.object({
          districtId: z.uuid(),
          rows: z.array(geoImportRowSchema).min(1).max(200),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const results: { index: number; action: "created" | "updated" }[] = [];
        for (const [index, row] of input.rows.entries()) {
          const existing = await ctx.db.query.AreasTable.findFirst({
            where: and(
              eq(AreasTable.districtId, input.districtId),
              eq(AreasTable.nameEn, row.nameEn),
              isNull(AreasTable.deletedAt),
            ),
          });
          if (existing) {
            await ctx.db
              .update(AreasTable)
              .set({
                nameAr: row.nameAr,
                sortOrder: row.sortOrder,
                updatedBy: ctx.session.user.id,
              })
              .where(eq(AreasTable.id, existing.id));
            results.push({ index, action: "updated" });
          } else {
            await ctx.db.insert(AreasTable).values({
              ...row,
              districtId: input.districtId,
              createdBy: ctx.session.user.id,
            });
            results.push({ index, action: "created" });
          }
        }
        return { results };
      }),

    bulkSetActive: adminProcedure
      .input(bulkActiveSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(AreasTable)
          .set({ isActive: input.isActive, updatedBy: ctx.session.user.id })
          .where(
            and(inArray(AreasTable.id, input.ids), isNull(AreasTable.deletedAt)),
          );
        return { ok: true as const };
      }),

    bulkDelete: adminProcedure
      .input(bulkIdsSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(AreasTable)
          .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
          .where(
            and(inArray(AreasTable.id, input.ids), isNull(AreasTable.deletedAt)),
          );
        return { ok: true as const };
      }),
  }),
});
