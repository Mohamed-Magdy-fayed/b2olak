import { eq } from "drizzle-orm";

import { db } from "@workspace/db/client";
import { PriceSyncRunsTable } from "@workspace/db/schemas/system/price-sync-runs";

import { pricedItemIds, recomputePriceStats } from "../../pricing/recompute";
import { inngest } from "../client";

/** Items recomputed per step — small enough to give visible progress. */
const BATCH_SIZE = 100;

/**
 * Admin-triggered full recompute of ALL item price stats. Processes items in
 * batches, bumping the run row after each so the admin UI (which polls
 * `price_sync_runs`) can show a live progress bar.
 */
export const onPriceSyncRequested = inngest.createFunction(
  { id: "pricing-sync-requested", retries: 1 },
  { event: "pricing/sync.requested" },
  async ({ event, step }) => {
    const { runId } = event.data;

    try {
      const itemIds = await step.run("load-item-ids", () => pricedItemIds(db));

      await step.run("set-total", () =>
        db
          .update(PriceSyncRunsTable)
          .set({ totalItems: itemIds.length, updatedBy: "system" })
          .where(eq(PriceSyncRunsTable.id, runId)),
      );

      let processed = 0;
      let upserted = 0;
      for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
        const batch = itemIds.slice(i, i + BATCH_SIZE);
        const batchIndex = i / BATCH_SIZE;
        const count = await step.run(`recompute-batch-${batchIndex}`, () =>
          recomputePriceStats(db, { itemIds: batch }),
        );
        processed += batch.length;
        upserted += count;
        await step.run(`progress-${batchIndex}`, () =>
          db
            .update(PriceSyncRunsTable)
            .set({
              processedItems: processed,
              statsUpserted: upserted,
              updatedBy: "system",
            })
            .where(eq(PriceSyncRunsTable.id, runId)),
        );
      }

      await step.run("mark-completed", () =>
        db
          .update(PriceSyncRunsTable)
          .set({
            status: "completed",
            finishedAt: new Date(),
            updatedBy: "system",
          })
          .where(eq(PriceSyncRunsTable.id, runId)),
      );

      return { ok: true as const, processed, upserted };
    } catch (err) {
      await db
        .update(PriceSyncRunsTable)
        .set({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          finishedAt: new Date(),
          updatedBy: "system",
        })
        .where(eq(PriceSyncRunsTable.id, runId));
      throw err;
    }
  },
);
