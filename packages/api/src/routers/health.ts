import { baseProcedure, createTRPCRouter } from "../init";

export const healthRouter = createTRPCRouter({
  ping: baseProcedure.query(() => ({
    ok: true as const,
    ts: new Date(),
  })),
});
