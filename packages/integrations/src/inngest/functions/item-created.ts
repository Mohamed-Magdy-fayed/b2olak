import { eq, inArray } from "drizzle-orm";

import { db } from "@workspace/db/client";
import { ItemAliasesTable } from "@workspace/db/schemas/catalog/item-aliases";
import { ItemMergeSuggestionsTable } from "@workspace/db/schemas/catalog/item-merge-suggestions";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import { CategoriesTable } from "@workspace/db/schemas/catalog/categories";
import { decideItemMerge } from "@workspace/validators/dedup";
import { normalizeText } from "@workspace/validators/normalize";

import { judgeItemMatch } from "../../ai/claude";
import { mergeItemInto } from "../../catalog/merge";
import { inngest } from "../client";

export const onItemCreated = inngest.createFunction(
  { id: "catalog-item-created", retries: 3 },
  { event: "catalog/item.created" },
  async ({ event, step }) => {
    const itemId = event.data.itemId;

    const item = await step.run("load-item", () =>
      db.query.ItemsTable.findFirst({ where: eq(ItemsTable.id, itemId) }),
    );
    // A concurrent admin action wins — only act on still-pending items.
    if (!item || item.status !== "pending_review") {
      return { skipped: true as const };
    }

    const suggestions = await step.run("load-suggestions", () =>
      db.query.ItemMergeSuggestionsTable.findMany({
        where: eq(ItemMergeSuggestionsTable.newItemId, itemId),
        with: { candidate: { with: { aliases: true } } },
      }),
    );

    const category = await step.run("load-category", () =>
      db.query.CategoriesTable.findFirst({
        where: eq(CategoriesTable.id, item.categoryId),
      }),
    );

    const verdict = await step.run("ai-judge", () =>
      judgeItemMatch({
        rawName: item.nameEn ?? item.nameAr ?? "",
        categoryNameEn: category?.nameEn ?? "unknown",
        candidates: suggestions.map((s) => ({
          id: s.candidateItemId,
          nameEn: s.candidate.nameEn,
          nameAr: s.candidate.nameAr,
          aliases: s.candidate.aliases.map((a) => a.alias),
          similarity: Number(s.similarityScore),
        })),
      }),
    );

    await step.run("record-verdict", async () => {
      if (suggestions.length === 0) return;
      await db
        .update(ItemMergeSuggestionsTable)
        .set({
          aiVerdict: verdict.verdict,
          aiCanonicalEn: verdict.canonicalNameEn || null,
          aiCanonicalAr: verdict.canonicalNameAr || null,
          updatedBy: "ai",
        })
        .where(
          inArray(
            ItemMergeSuggestionsTable.id,
            suggestions.map((s) => s.id),
          ),
        );
    });

    const matched = suggestions.find(
      (s) => s.candidateItemId === verdict.matchedItemId,
    );
    const similarity = matched ? Number(matched.similarityScore) : 0;
    const action = decideItemMerge({
      verdict: verdict.verdict,
      matchedItemId: verdict.matchedItemId,
      similarity,
    });

    if (action === "merge") {
      await step.run("auto-merge", async () => {
        await mergeItemInto(db, itemId, verdict.matchedItemId!, "ai");
        await db
          .update(ItemMergeSuggestionsTable)
          .set({ status: "accepted", updatedBy: "ai" })
          .where(eq(ItemMergeSuggestionsTable.newItemId, itemId));
      });
      return { merged: true as const, into: verdict.matchedItemId };
    }

    if (action === "approve") {
      await step.run("approve-with-canonical-names", async () => {
        const nameEn = verdict.canonicalNameEn || item.nameEn;
        const nameAr = verdict.canonicalNameAr || item.nameAr;
        await db
          .update(ItemsTable)
          .set({
            nameEn,
            nameAr,
            normalizedEn: nameEn ? normalizeText(nameEn) : null,
            normalizedAr: nameAr ? normalizeText(nameAr) : null,
            status: "approved",
            updatedBy: "ai",
          })
          .where(eq(ItemsTable.id, itemId));

        // Keep the raw input findable as an alias
        const raw = item.nameEn ?? item.nameAr;
        if (raw) {
          await db
            .insert(ItemAliasesTable)
            .values({
              itemId,
              alias: raw,
              normalizedAlias: normalizeText(raw),
              createdBy: "ai",
            })
            .onConflictDoNothing({ target: ItemAliasesTable.normalizedAlias });
        }
      });
      return { approved: true as const };
    }

    return { pending: true as const }; // unsure → admin queue
  },
);
