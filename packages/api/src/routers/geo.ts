import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { AreasTable } from "@workspace/db/schemas/geo/areas";
import { CitiesTable } from "@workspace/db/schemas/geo/cities";
import { DistrictsTable } from "@workspace/db/schemas/geo/districts";
import { cached } from "@workspace/integrations/redis";

import { baseProcedure, createTRPCRouter } from "../init";

/**
 * Public delivery-coverage reads for the cascading address selects
 * (city → district → area/street). Admin CRUD lives in admin/geo.
 */
export const geoRouter = createTRPCRouter({
  cities: baseProcedure.query(({ ctx }) =>
    cached("geo:cities", 60, () =>
      ctx.db.query.CitiesTable.findMany({
        where: and(eq(CitiesTable.isActive, true), isNull(CitiesTable.deletedAt)),
        orderBy: [asc(CitiesTable.sortOrder), asc(CitiesTable.nameAr)],
      }),
    ),
  ),

  districts: baseProcedure
    .input(z.object({ cityId: z.uuid() }))
    .query(({ ctx, input }) =>
      cached(`geo:districts:${input.cityId}`, 60, () =>
        ctx.db.query.DistrictsTable.findMany({
          where: and(
            eq(DistrictsTable.cityId, input.cityId),
            eq(DistrictsTable.isActive, true),
            isNull(DistrictsTable.deletedAt),
          ),
          orderBy: [asc(DistrictsTable.sortOrder), asc(DistrictsTable.nameAr)],
        }),
      ),
    ),

  areas: baseProcedure
    .input(z.object({ districtId: z.uuid() }))
    .query(({ ctx, input }) =>
      cached(`geo:areas:${input.districtId}`, 60, () =>
        ctx.db.query.AreasTable.findMany({
          where: and(
            eq(AreasTable.districtId, input.districtId),
            eq(AreasTable.isActive, true),
            isNull(AreasTable.deletedAt),
          ),
          orderBy: [asc(AreasTable.sortOrder), asc(AreasTable.nameAr)],
        }),
      ),
    ),
});
