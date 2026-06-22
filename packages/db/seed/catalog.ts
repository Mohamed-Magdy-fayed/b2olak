import { and, eq } from "drizzle-orm";

import { normalizeText } from "@workspace/validators/normalize";

import { CategoriesTable } from "../src/schemas/catalog/categories";
import { ItemUnitsTable } from "../src/schemas/catalog/item-units";
import { ItemsTable } from "../src/schemas/catalog/items";
import { UnitsTable } from "../src/schemas/catalog/units";
import { SystemSettingsTable } from "../src/schemas/system/system-settings";
import { db } from "./db";
import { seedCategories, seedItems } from "./catalog-data";

/** Base units of measure — mirrors migration 0009. */
const seedUnits = [
  { code: "piece", en: "Piece", ar: "قطعة", sortOrder: 0 },
  { code: "kg", en: "Kilogram", ar: "كيلوجرام", sortOrder: 1 },
  { code: "gram", en: "Gram", ar: "جرام", sortOrder: 2 },
  { code: "liter", en: "Liter", ar: "لتر", sortOrder: 3 },
  { code: "pack", en: "Pack", ar: "عبوة", sortOrder: 4 },
] as const;

export async function seedCatalog() {
  // Units — upsert by code.
  const unitIdByCode = new Map<string, string>();
  for (const unit of seedUnits) {
    const [row] = await db
      .insert(UnitsTable)
      .values({
        code: unit.code,
        nameEn: unit.en,
        nameAr: unit.ar,
        sortOrder: unit.sortOrder,
        createdBy: "seed",
      })
      .onConflictDoUpdate({
        target: UnitsTable.code,
        set: { nameEn: unit.en, nameAr: unit.ar, sortOrder: unit.sortOrder },
      })
      .returning();
    if (row) unitIdByCode.set(unit.code, row.id);
  }

  // Categories — upsert by slug (updates imageUrl on re-run).
  const categoryIdBySlug = new Map<string, string>();
  for (const category of seedCategories) {
    const [row] = await db
      .insert(CategoriesTable)
      .values({
        nameEn: category.en,
        nameAr: category.ar,
        slug: category.slug,
        sortOrder: category.sortOrder,
        imageUrl: category.imageUrl ?? null,
        createdBy: "seed",
      })
      .onConflictDoUpdate({
        target: CategoriesTable.slug,
        set: {
          nameEn: category.en,
          nameAr: category.ar,
          sortOrder: category.sortOrder,
          imageUrl: category.imageUrl ?? null,
        },
      })
      .returning();
    if (row) categoryIdBySlug.set(category.slug, row.id);
  }

  // Items — load existing seed items once, then upsert by nameEn match.
  const existingSeedItems = await db
    .select({ id: ItemsTable.id, nameEn: ItemsTable.nameEn })
    .from(ItemsTable)
    .where(eq(ItemsTable.source, "seed"));
  const existingByName = new Map(existingSeedItems.map((i) => [i.nameEn, i.id]));

  let inserted = 0;
  let updated = 0;

  for (const item of seedItems) {
    const categoryId = categoryIdBySlug.get(item.categorySlug);
    if (!categoryId) throw new Error(`Unknown category ${item.categorySlug}`);

    const existingId = existingByName.get(item.en);

    if (existingId) {
      await db
        .update(ItemsTable)
        .set({
          imageUrl: item.imageUrl ?? null,
          nameEn: item.en,
          nameAr: item.ar,
          normalizedEn: normalizeText(item.en),
          normalizedAr: normalizeText(item.ar),
          categoryId,
        })
        .where(eq(ItemsTable.id, existingId));
      updated++;
    } else {
      const [createdItem] = await db
        .insert(ItemsTable)
        .values({
          categoryId,
          nameEn: item.en,
          nameAr: item.ar,
          normalizedEn: normalizeText(item.en),
          normalizedAr: normalizeText(item.ar),
          imageUrl: item.imageUrl ?? null,
          status: "approved",
          source: "seed",
          createdBy: "seed",
        })
        .returning({ id: ItemsTable.id });

      if (createdItem) {
        const unitId = unitIdByCode.get(item.unit);
        if (unitId) {
          await db
            .insert(ItemUnitsTable)
            .values({
              itemId: createdItem.id,
              unitId,
              isDefault: true,
              sortOrder: 0,
              createdBy: "seed",
            })
            .onConflictDoNothing();
        }
        inserted++;
      }
    }
  }

  console.log(
    `Catalog seeded: ${seedCategories.length} categories upserted, ${inserted} items inserted, ${updated} items updated.`,
  );
}

export async function seedSettings() {
  const defaults: {
    key: string;
    value: unknown;
    description: string;
  }[] = [
    {
      key: "delivery_fee_egp",
      value: { amount: 25 },
      description: "Flat delivery fee in EGP applied to every order",
    },
    {
      key: "support_whatsapp_number",
      value: { value: "" },
      description: "WhatsApp number for customer support deep links",
    },
  ];

  for (const setting of defaults) {
    await db
      .insert(SystemSettingsTable)
      .values({ ...setting, createdBy: "seed" })
      .onConflictDoNothing({ target: SystemSettingsTable.key });
  }

  console.log("Settings seeded.");
}
