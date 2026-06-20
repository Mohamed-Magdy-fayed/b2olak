import { z } from "zod";

/** Create/update payload shared by cities, districts and areas (admin geo CRUD). */
export const geoNameSchema = z.object({
  nameEn: z.string().min(2).max(128),
  nameAr: z.string().min(2).max(128),
  sortOrder: z.int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

/** One CSV-import row for any geo level — upserted by `nameEn`. */
export const geoImportRowSchema = z.object({
  nameEn: z.string().trim().min(2).max(128),
  nameAr: z.string().trim().min(2).max(128),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const geoBulkIdsSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
});

export const geoBulkActiveSchema = geoBulkIdsSchema.extend({
  isActive: z.boolean(),
});
