import { and, eq, isNull, sql } from "drizzle-orm";

import { UsersTable } from "@workspace/db/schemas/auth/users";
import { ItemsTable } from "@workspace/db/schemas/catalog/items";
import { DriverProfilesTable } from "@workspace/db/schemas/drivers/driver-profiles";

import { adminProcedure, createTRPCRouter } from "../../init";
import { adminCatalogRouter } from "./catalog";
import { adminSettingsRouter } from "./settings";

export const adminRouter = createTRPCRouter({
  catalog: adminCatalogRouter,
  settings: adminSettingsRouter,

  dashboard: adminProcedure.query(async ({ ctx }) => {
    const [customers] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(UsersTable)
      .where(
        and(eq(UsersTable.role, "customer"), isNull(UsersTable.deletedAt)),
      );
    const [drivers] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(DriverProfilesTable)
      .where(isNull(DriverProfilesTable.deletedAt));
    const [items] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(ItemsTable)
      .where(isNull(ItemsTable.deletedAt));
    const [pendingItems] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(ItemsTable)
      .where(
        and(
          eq(ItemsTable.status, "pending_review"),
          isNull(ItemsTable.deletedAt),
        ),
      );

    return {
      customers: customers?.count ?? 0,
      drivers: drivers?.count ?? 0,
      items: items?.count ?? 0,
      pendingItems: pendingItems?.count ?? 0,
      // orders land in Phase 6
      activeOrders: 0,
    };
  }),
});
