import { z } from "zod";

import { WaitlistSignupsTable } from "@workspace/db/schemas/marketing/waitlist-signups";
import { egyptianPhoneSchema } from "@workspace/validators/auth";

import { baseProcedure, createTRPCRouter } from "../init";
import { enforceRateLimit, ipFromHeaders } from "../ratelimit";

export const waitlistRouter = createTRPCRouter({
  /**
   * Landing-page app-launch waitlist. Always returns ok (no enumeration of
   * existing signups); duplicates are silently ignored.
   */
  join: baseProcedure
    .input(z.object({ phone: egyptianPhoneSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("waitlist-join", input.phone, 3, "1 h");
      await enforceRateLimit(
        "waitlist-join-ip",
        ipFromHeaders(ctx.headers),
        10,
        "1 h",
      );

      await ctx.db
        .insert(WaitlistSignupsTable)
        .values({
          phone: input.phone,
          locale: ctx.locale,
          createdBy: "landing",
        })
        .onConflictDoNothing();

      return { ok: true as const };
    }),
});
