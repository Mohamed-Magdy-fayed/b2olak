import { createTRPCRouter } from "./init";
import { addressesRouter } from "./routers/addresses";
import { adminRouter } from "./routers/admin/index";
import { authRouter } from "./routers/auth";
import { catalogRouter } from "./routers/catalog";
import { driverRouter } from "./routers/driver";
import { geoRouter } from "./routers/geo";
import { healthRouter } from "./routers/health";
import { itemsRouter } from "./routers/items";
import { ordersRouter } from "./routers/orders";
import { waitlistRouter } from "./routers/waitlist";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  catalog: catalogRouter,
  geo: geoRouter,
  items: itemsRouter,
  addresses: addressesRouter,
  orders: ordersRouter,
  driver: driverRouter,
  admin: adminRouter,
  waitlist: waitlistRouter,
});

export type AppRouter = typeof appRouter;
