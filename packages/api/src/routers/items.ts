import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import { ItemAliasesTable } from "@workspace/db/schemas/catalog/item-aliases";
import { ItemMergeSuggestionsTable } from "@workspace/db/schemas/catalog/item-merge-suggestions";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import { inngest } from "@workspace/integrations/inngest/client";
import { itemNameSchema, itemUnitSchema } from "@workspace/validators/catalog";
import { detectScript, normalizeText } from "@workspace/validators/normalize";

import { createTRPCRouter, customerProcedure } from "../init";
import { enforceRateLimit } from "../ratelimit";

/** Dedup thresholds (docs/05 stage 2) — tune with real data. */
const SAME_ITEM_SIMILARITY = 0.85;
const CANDIDATE_SIMILARITY = 0.45;

export const itemsRouter = createTRPCRouter({
  /**
   * "Can't find it? Add it" (journey C4). New items are immediately usable;
   * normalization + trgm + an async AI judge keep the catalog deduped.
   */
  create: customerProcedure
    .input(
      z.object({
        name: itemNameSchema,
        categoryId: z.uuid(),
        defaultUnit: itemUnitSchema.default("piece"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("item-create", ctx.session.user.id, 10, "1 h");

      const normalized = normalizeText(input.name);
      const script = detectScript(input.name);

      // 1. Exact match on canonical names or aliases → return existing
      const aliasHit = await ctx.db.query.ItemAliasesTable.findFirst({
        where: eq(ItemAliasesTable.normalizedAlias, normalized),
        with: { item: true },
      });
      const exact =
        aliasHit?.item ??
        (await ctx.db.query.ItemsTable.findFirst({
          where: and(
            isNull(ItemsTable.deletedAt),
            or(
              eq(ItemsTable.normalizedEn, normalized),
              eq(ItemsTable.normalizedAr, normalized),
            ),
          ),
        }));
      if (exact) {
        const canonical =
          exact.status === "merged" && exact.mergedIntoItemId
            ? await ctx.db.query.ItemsTable.findFirst({
                where: eq(ItemsTable.id, exact.mergedIntoItemId),
              })
            : exact;
        if (canonical) return { item: canonical, matched: true as const };
      }

      // 2. Fuzzy candidates via pg_trgm
      const score = sql<number>`greatest(
        coalesce(similarity(${ItemsTable.normalizedEn}, ${normalized}), 0),
        coalesce(similarity(${ItemsTable.normalizedAr}, ${normalized}), 0)
      )`;
      const candidates = await ctx.db
        .select({
          id: ItemsTable.id,
          nameEn: ItemsTable.nameEn,
          nameAr: ItemsTable.nameAr,
          similarity: score,
        })
        .from(ItemsTable)
        .where(
          and(
            isNull(ItemsTable.deletedAt),
            ne(ItemsTable.status, "merged"),
            sql`${score} >= ${CANDIDATE_SIMILARITY}`,
          ),
        )
        .orderBy(desc(score))
        .limit(5);

      const best = candidates[0];
      if (best && best.similarity >= SAME_ITEM_SIMILARITY) {
        await ctx.db
          .insert(ItemAliasesTable)
          .values({
            itemId: best.id,
            alias: input.name,
            normalizedAlias: normalized,
            locale: script,
            createdBy: ctx.session.user.id,
          })
          .onConflictDoNothing({ target: ItemAliasesTable.normalizedAlias });
        const item = await ctx.db.query.ItemsTable.findFirst({
          where: eq(ItemsTable.id, best.id),
        });
        return { item: item!, matched: true as const };
      }

      // 3. Insert as pending review — usable immediately
      const [item] = await ctx.db
        .insert(ItemsTable)
        .values({
          categoryId: input.categoryId,
          nameEn: script === "en" ? input.name : null,
          nameAr: script === "ar" ? input.name : null,
          normalizedEn: script === "en" ? normalized : null,
          normalizedAr: script === "ar" ? normalized : null,
          defaultUnit: input.defaultUnit,
          status: "pending_review",
          source: "customer",
          createdByUserId: ctx.session.user.id,
          createdBy: ctx.session.user.id,
        })
        .returning();

      if (item && candidates.length > 0) {
        await ctx.db.insert(ItemMergeSuggestionsTable).values(
          candidates.map((candidate) => ({
            newItemId: item.id,
            candidateItemId: candidate.id,
            similarityScore: candidate.similarity.toFixed(3),
            createdBy: ctx.session.user.id,
          })),
        );
      }

      if (item) {
        try {
          await inngest.send({
            name: "catalog/item.created",
            data: { itemId: item.id },
          });
        } catch (error) {
          // Inngest down/dev without dev-server: item stays pending, admin
          // queue still catches it.
          console.warn("inngest send failed:", error);
        }
      }

      return { item: item!, matched: false as const };
    }),
});
