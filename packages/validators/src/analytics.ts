import { z } from "zod";

/** Client-emitted analytics events forwarded to Inngest (best-effort). */
export const trackEventSchema = z.object({
  event: z.enum(["begin_checkout"]),
  value: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  itemCount: z.number().int().nonnegative().optional(),
});
