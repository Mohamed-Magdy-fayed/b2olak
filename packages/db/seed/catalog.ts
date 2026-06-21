import { eq } from "drizzle-orm";

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
  // Units first — needed to link items below. Idempotent by code.
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
      .onConflictDoNothing({ target: UnitsTable.code })
      .returning();
    if (row) {
      unitIdByCode.set(unit.code, row.id);
    } else {
      const existing = await db.query.UnitsTable.findFirst({
        where: eq(UnitsTable.code, unit.code),
      });
      if (existing) unitIdByCode.set(unit.code, existing.id);
    }
  }

  const existingSeedItem = await db.query.ItemsTable.findFirst({
    where: eq(ItemsTable.source, "seed"),
  });
  if (existingSeedItem) {
    console.log("Catalog already seeded — skipping.");
    return;
  }

  const categoryIdBySlug = new Map<string, string>();

  for (const category of seedCategories) {
    const [row] = await db
      .insert(CategoriesTable)
      .values({
        nameEn: category.en,
        nameAr: category.ar,
        slug: category.slug,
        sortOrder: category.sortOrder,
        createdBy: "seed",
      })
      .onConflictDoNothing({ target: CategoriesTable.slug })
      .returning();

    if (row) {
      categoryIdBySlug.set(category.slug, row.id);
    } else {
      const existing = await db.query.CategoriesTable.findFirst({
        where: eq(CategoriesTable.slug, category.slug),
      });
      if (existing) categoryIdBySlug.set(category.slug, existing.id);
    }
  }

  for (const item of seedItems) {
    const categoryId = categoryIdBySlug.get(item.categorySlug);
    if (!categoryId) throw new Error(`Unknown category ${item.categorySlug}`);

    const [createdItem] = await db
      .insert(ItemsTable)
      .values({
        categoryId,
        nameEn: item.en,
        nameAr: item.ar,
        normalizedEn: normalizeText(item.en),
        normalizedAr: normalizeText(item.ar),
        status: "approved",
        source: "seed",
        createdBy: "seed",
      })
      .returning({ id: ItemsTable.id });

    const unitId = unitIdByCode.get(item.unit);
    if (createdItem && unitId) {
      await db.insert(ItemUnitsTable).values({
        itemId: createdItem.id,
        unitId,
        isDefault: true,
        sortOrder: 0,
        createdBy: "seed",
      });
    }
  }

  console.log(
    `Catalog seeded: ${seedCategories.length} categories, ${seedItems.length} items.`,
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
