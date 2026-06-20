import { z } from "zod";

/** Shopping-checklist line update (journey D4) — price required for found/substituted. */
export const updateLineSchema = z.object({
  orderItemId: z.uuid(),
  status: z.enum(["found", "unavailable", "substituted", "pending"]),
  actualUnitPrice: z.number().positive().max(100_000).optional(),
});

/** COD hand-off (journey D5) — the cash amount the driver collected. */
export const markDeliveredSchema = z.object({
  orderId: z.uuid(),
  amountCollected: z.number().positive().max(100_000),
});
