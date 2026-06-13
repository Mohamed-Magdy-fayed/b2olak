import { z } from "zod";

import { egyptianPhoneSchema } from "./auth";

/**
 * Structured addresses: customers pick from admin-defined coverage
 * (city → district → area/street), then fill the building details.
 * The API resolves the chain into localized name snapshots.
 */
export const addressUpsertSchema = z.object({
  label: z.string().trim().max(64).optional(),
  cityId: z.uuid(),
  districtId: z.uuid(),
  areaId: z.uuid(),
  /** Building number or name — required so riders can find the door. */
  building: z.string().trim().min(1).max(64),
  floor: z.string().trim().max(32).optional(),
  apartment: z.string().trim().max(32).optional(),
  landmark: z.string().trim().max(256).optional(),
  contactPhone: egyptianPhoneSchema,
  isDefault: z.boolean().default(false),
});

export type AddressUpsert = z.infer<typeof addressUpsertSchema>;
