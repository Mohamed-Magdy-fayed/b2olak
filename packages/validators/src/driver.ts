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

/** Admin settlement — cash a driver handed over, credited against their balance. */
export const settleDriverSchema = z.object({
  driverUserId: z.uuid(),
  amount: z.number().positive().max(1_000_000),
  note: z.string().max(500).optional(),
});
