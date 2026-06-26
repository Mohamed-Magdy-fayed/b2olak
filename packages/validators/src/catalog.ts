import { z } from "zod";

import { unitKindValues } from "./units";

/** 2–80 chars, Arabic/Latin letters + digits + spaces, no URLs (docs/05 §abuse). */
export const itemNameSchema = z
  .string()
  .trim()
  .min(2, { error: "validation.itemNameTooShort" })
  .max(80, { error: "validation.itemNameTooLong" })
  .regex(/^[\p{L}\p{N}\s%.-]+$/u, { error: "validation.itemNameInvalid" });

export const categoryUpsertSchema = z.object({
  nameEn: z.string().trim().min(2).max(128),
  nameAr: z.string().trim().min(2).max(128),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(128)
    .regex(/^[a-z0-9-]+$/, { error: "validation.slugInvalid" }),
  imageUrl: z.url().nullish(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
});

/** Managed unit of measure (KG, piece, bottle…). `code` is the order snapshot slug. */
export const unitUpsertSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[a-z0-9-]+$/, { error: "validation.slugInvalid" }),
  nameEn: z.string().trim().min(1).max(64),
  nameAr: z.string().trim().min(1).max(64),
  kind: z.enum(unitKindValues).default("count"),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
});

/**
 * Kept a plain object (not `.refine`d) so `.partial().extend()` works for the
 * update procedure. The `defaultUnitId ∈ unitIds` integrity check is enforced
 * server-side in the admin catalog router.
 */
export const adminItemUpsertSchema = z.object({
  categoryId: z.uuid(),
  nameEn: itemNameSchema,
  nameAr: itemNameSchema,
  unitIds: z.array(z.uuid()).min(1),
  defaultUnitId: z.uuid(),
  imageUrl: z.url().nullish(),
});

export const adminItemsListSchema = z.object({
  search: z.string().trim().max(80).optional(),
  categoryId: z.uuid().optional(),
  status: z.enum(["approved", "pending_review", "merged"]).optional(),
  cursor: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(50),
});

export const uploadImageSchema = z.object({
  // ~4MB binary ≈ 5.6M base64 chars
  base64: z.string().min(1).max(6_000_000),
  mimeType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ]),
  folder: z.enum(["categories", "items"]),
});

export const settingsUpdateSchema = z.object({
  deliveryFeeEgp: z.number().min(0).max(10_000),
  supportWhatsappNumber: z.string().trim().max(20),
});

/** Empty string clears the link; otherwise must be a valid URL. */
const storeUrlSchema = z
  .string()
  .trim()
  .max(512)
  .refine((v) => v === "" || z.url().safeParse(v).success, {
    error: "validation.urlInvalid",
  })
  .transform((v) => (v === "" ? null : v));

export const storeLinksUpdateSchema = z.object({
  playStoreUrl: storeUrlSchema,
  appStoreUrl: storeUrlSchema,
});

/** Bulk catalog import — one item row (default unit + optional pipe-list). */
export const importItemRowSchema = z.object({
  nameEn: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(2).max(80),
  categorySlug: z.string().trim().min(1).max(128),
  /** Default unit code. */
  unit: z.string().trim().min(1).max(32).default("piece"),
  /** Optional pipe-separated list of all linked unit codes (default included). */
  units: z.string().trim().max(256).optional(),
});

/** Bulk category import — one row, upserted by slug. */
export const importCategoryRowSchema = z.object({
  nameEn: z.string().trim().min(2).max(128),
  nameAr: z.string().trim().min(2).max(128),
  slug: z.string().trim().min(1).max(128),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const whatsappProviderSchema = z.enum(["wapilot", "twilio", "console"]);

export const whatsappSettingsUpdateSchema = z.object({
  provider: whatsappProviderSchema,
  wapilot: z
    .object({
      instanceId: z.string().trim().min(1).max(200),
      token: z.string().trim().min(1).max(500),
    })
    .optional(),
  twilio: z
    .object({
      accountSid: z.string().trim().regex(/^AC[a-z0-9]{32}$/),
      authToken: z.string().trim().min(32).max(64),
      fromNumber: z.string().trim().regex(/^\+[1-9]\d{1,14}$/),
    })
    .optional(),
});
