import { eq } from "drizzle-orm";

import { normalizeText } from "@workspace/validators/normalize";

import { db } from "../src/client";
import { CategoriesTable } from "../src/schemas/catalog/categories";
import { ItemsTable } from "../src/schemas/catalog/items";
import { SystemSettingsTable } from "../src/schemas/system/system-settings";
import { seedCategories, seedItems } from "./catalog-data";

export async function seedCatalog() {
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

    await db.insert(ItemsTable).values({
      categoryId,
      nameEn: item.en,
      nameAr: item.ar,
      normalizedEn: normalizeText(item.en),
      normalizedAr: normalizeText(item.ar),
      defaultUnit: item.unit,
      status: "approved",
      source: "seed",
      createdBy: "seed",
    });
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
