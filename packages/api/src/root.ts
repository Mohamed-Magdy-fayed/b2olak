import { createTRPCRouter } from "./init";
import { adminRouter } from "./routers/admin/index";
import { authRouter } from "./routers/auth";
import { catalogRouter } from "./routers/catalog";
import { healthRouter } from "./routers/health";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  catalog: catalogRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
