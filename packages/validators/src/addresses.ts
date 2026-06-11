import { z } from "zod";

import { egyptianPhoneSchema } from "./auth";

export const addressUpsertSchema = z.object({
  label: z.string().trim().max(64).optional(),
  city: z.string().trim().min(2).max(128),
  area: z.string().trim().min(2).max(128),
  street: z.string().trim().min(2).max(256),
  building: z.string().trim().max(64).optional(),
  floor: z.string().trim().max(32).optional(),
  apartment: z.string().trim().max(32).optional(),
  landmark: z.string().trim().max(256).optional(),
  contactPhone: egyptianPhoneSchema,
  isDefault: z.boolean().default(false),
});

export type AddressUpsert = z.infer<typeof addressUpsertSchema>;
