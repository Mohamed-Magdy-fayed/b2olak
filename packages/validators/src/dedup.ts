/**
 * Item dedup decision rules. Pure — no DB, no AI calls.
 * See docs/05-item-dedup-pipeline.md (stage 3) and the server caller
 * packages/integrations/src/inngest/functions/item-created.ts.
 */

/** trgm similarity at/above which an AI "match" verdict auto-merges (docs/05 stage 3). */
export const AUTO_MERGE_MIN_SIMILARITY = 0.7;

export type MergeVerdict = "match" | "no_match" | "unsure";

/**
 * - `merge`   — auto-merge the new item into the matched candidate.
 * - `approve` — accept the new item as its own catalog entry.
 * - `pending` — route to the admin review queue.
 */
export type MergeAction = "merge" | "approve" | "pending";

/**
 * Reconcile the AI verdict with the trigram similarity into a concrete action.
 * Conservative: auto-merge only when the AI says "match" against a real candidate
 * AND the trigram similarity clears the threshold; everything else is routed to a
 * human (a low-confidence match, an "unsure", or a "match" with no candidate id).
 */
export function decideItemMerge(input: {
  verdict: MergeVerdict;
  matchedItemId: string | null;
  similarity: number;
}): MergeAction {
  if (input.verdict === "match" && input.matchedItemId) {
    return input.similarity >= AUTO_MERGE_MIN_SIMILARITY ? "merge" : "pending";
  }
  if (input.verdict === "no_match") return "approve";
  return "pending";
}
