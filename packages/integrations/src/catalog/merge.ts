import { eq } from "drizzle-orm";

import type { Db } from "@workspace/db/client";
import { ItemAliasesTable } from "@workspace/db/schemas/catalog/item-aliases";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import { OrderItemsTable } from "@workspace/db/schemas/orders/order-items";
import { detectScript, normalizeText } from "@workspace/validators/normalize";

/**
 * Merge a duplicate item into a canonical one (docs/05):
 * - duplicate's names become aliases of the canonical item
 * - order lines repoint to the canonical item (name snapshots stay frozen)
 * - duplicate is marked merged + mergedIntoItemId
 * Shared by the Inngest auto-merge and the admin review UI.
 */
export async function mergeItemInto(
  db: Db,
  duplicateItemId: string,
  canonicalItemId: string,
  actor: string,
) {
  const duplicate = await db.query.ItemsTable.findFirst({
    where: eq(ItemsTable.id, duplicateItemId),
  });
  if (!duplicate || duplicate.id === canonicalItemId) return;

  await db.transaction(async (tx) => {
    for (const raw of [duplicate.nameEn, duplicate.nameAr]) {
      if (!raw) continue;
      await tx
        .insert(ItemAliasesTable)
        .values({
          itemId: canonicalItemId,
          alias: raw,
          normalizedAlias: normalizeText(raw),
          locale: detectScript(raw),
          createdBy: actor,
        })
        .onConflictDoNothing({ target: ItemAliasesTable.normalizedAlias });
    }

    // Move the duplicate's own aliases to the canonical item
    await tx
      .update(ItemAliasesTable)
      .set({ itemId: canonicalItemId, updatedBy: actor })
      .where(eq(ItemAliasesTable.itemId, duplicateItemId));

    await tx
      .update(OrderItemsTable)
      .set({ itemId: canonicalItemId, updatedBy: actor })
      .where(eq(OrderItemsTable.itemId, duplicateItemId));

    await tx
      .update(ItemsTable)
      .set({
        status: "merged",
        mergedIntoItemId: canonicalItemId,
        updatedBy: actor,
      })
      .where(eq(ItemsTable.id, duplicateItemId));
  });
}

/** Recover from a wrong merge: restore the item as pending review. */
export async function unmergeItem(db: Db, itemId: string, actor: string) {
  await db
    .update(ItemsTable)
    .set({ status: "pending_review", mergedIntoItemId: null, updatedBy: actor })
    .where(eq(ItemsTable.id, itemId));
}
