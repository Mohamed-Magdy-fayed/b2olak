import { desc, eq } from "drizzle-orm";

import { UsersTable } from "@workspace/db/schemas/auth/users";
import { CustomerWalletEntriesTable } from "@workspace/db/schemas/wallet/customer-wallet-entries";

import { createTRPCRouter, customerProcedure } from "../init";

export const walletRouter = createTRPCRouter({
  /** Customer wallet balance + recent ledger entries (journey C-wallet). */
  myBalance: customerProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [user] = await ctx.db
      .select({ walletBalance: UsersTable.walletBalance })
      .from(UsersTable)
      .where(eq(UsersTable.id, userId));

    const entries = await ctx.db.query.CustomerWalletEntriesTable.findMany({
      where: eq(CustomerWalletEntriesTable.userId, userId),
      orderBy: desc(CustomerWalletEntriesTable.createdAt),
      limit: 20,
    });

    return { balance: user?.walletBalance ?? "0.00", entries };
  }),
});
