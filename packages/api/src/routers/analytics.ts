import { inngest } from "@workspace/integrations/inngest/client";
import { trackEventSchema } from "@workspace/validators/analytics";

import { baseProcedure, createTRPCRouter } from "../init";
import { enforceRateLimit, ipFromHeaders } from "../ratelimit";

export const analyticsRouter = createTRPCRouter({
  track: baseProcedure
    .input(trackEventSchema)
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("analytics-track", ipFromHeaders(ctx.headers), 120, "1 m");

      if (input.event === "begin_checkout") {
        try {
          await inngest.send({
            name: "checkout/started",
            data: {
              userId: ctx.session?.user.id,
              value: input.value ?? 0,
              currency: input.currency ?? "EGP",
              itemCount: input.itemCount ?? 0,
            },
          });
        } catch {
          // best-effort — analytics must never block the user
        }
      }

      return { ok: true as const };
    }),
});
