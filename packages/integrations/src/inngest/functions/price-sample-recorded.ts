import { db } from "@workspace/db/client";

import { recomputePriceStats } from "../../pricing/recompute";
import { inngest } from "../client";

/**
 * Non-blocking: after a driver records a real price for a line, refresh the
 * market-price stats for just that item. Cheap (one grouped upsert scoped to
 * the item) and idempotent.
 */
export const onPriceSampleRecorded = inngest.createFunction(
  { id: "pricing-sample-recorded", retries: 2 },
  { event: "pricing/sample.recorded" },
  async ({ event, step }) => {
    const { itemId } = event.data;

    const upserted = await step.run("recompute-item", () =>
      recomputePriceStats(db, { itemIds: [itemId] }),
    );

    return { ok: true as const, upserted };
  },
);
