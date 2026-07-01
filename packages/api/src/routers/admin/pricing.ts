import { and, desc, eq, lt } from "drizzle-orm";

import { PriceSyncRunsTable } from "@workspace/db/schemas/system/price-sync-runs";
import { inngest } from "@workspace/integrations/inngest/client";

import { adminProcedure, createTRPCRouter } from "../../init";

/**
 * A `running` row older than this is treated as stale (a job that died without
 * marking itself failed), so a fresh sync can be started instead of wedging.
 */
const STALE_RUN_MS = 10 * 60 * 1000;

export const adminPricingRouter = createTRPCRouter({
  /** Latest sync run — the admin UI polls this to drive the progress bar. */
  syncStatus: adminProcedure.query(async ({ ctx }) => {
    const run = await ctx.db.query.PriceSyncRunsTable.findFirst({
      orderBy: desc(PriceSyncRunsTable.startedAt),
    });
    return run ?? null;
  }),

  /**
   * Kick off a full recompute of every item's price stats. Idempotent while a
   * run is in flight — returns the running row instead of starting a second.
   */
  startSync: adminProcedure.mutation(async ({ ctx }) => {
    // A recent running row means a sync is genuinely in flight — return it.
    const running = await ctx.db.query.PriceSyncRunsTable.findFirst({
      where: eq(PriceSyncRunsTable.status, "running"),
      orderBy: desc(PriceSyncRunsTable.startedAt),
    });
    if (running && Date.now() - running.startedAt.getTime() < STALE_RUN_MS) {
      return { runId: running.id, alreadyRunning: true as const };
    }

    // Clear any stale running rows (a job that died without marking failed) so
    // this new run isn't wedged behind them.
    await ctx.db
      .update(PriceSyncRunsTable)
      .set({
        status: "failed",
        error: "stale run cleared",
        finishedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .where(
        and(
          eq(PriceSyncRunsTable.status, "running"),
          lt(
            PriceSyncRunsTable.startedAt,
            new Date(Date.now() - STALE_RUN_MS),
          ),
        ),
      );

    const [run] = await ctx.db
      .insert(PriceSyncRunsTable)
      .values({ status: "running", createdBy: ctx.session.user.id })
      .returning({ id: PriceSyncRunsTable.id });
    if (!run) throw new Error("failed to create price sync run");

    try {
      await inngest.send({
        id: `pricing-sync:${run.id}`,
        name: "pricing/sync.requested",
        data: { runId: run.id },
      });
    } catch {
      await ctx.db
        .update(PriceSyncRunsTable)
        .set({
          status: "failed",
          error: "failed to enqueue sync job",
          finishedAt: new Date(),
          updatedBy: ctx.session.user.id,
        })
        .where(eq(PriceSyncRunsTable.id, run.id));
      throw new Error("failed to enqueue sync job");
    }

    return { runId: run.id, alreadyRunning: false as const };
  }),
});
