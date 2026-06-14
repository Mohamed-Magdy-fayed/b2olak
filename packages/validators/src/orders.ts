import { z } from "zod";

export const placeOrderSchema = z.object({
  addressId: z.uuid(),
  note: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        itemId: z.uuid(),
        qty: z.number().positive().max(1000),
        /** Must be one of the item's linked units — enforced server-side. */
        unitId: z.uuid(),
        note: z.string().trim().max(200).optional(),
      }),
    )
    .min(1, { error: "validation.cartEmpty" })
    .max(100),
});

export const cancelOrderSchema = z.object({
  orderId: z.uuid(),
  reason: z.string().trim().max(300).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
