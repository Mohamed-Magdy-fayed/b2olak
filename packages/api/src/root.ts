import { createTRPCRouter } from "./init";
import { authRouter } from "./routers/auth";
import { healthRouter } from "./routers/health";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
