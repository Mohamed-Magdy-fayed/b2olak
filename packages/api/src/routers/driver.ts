import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { DriverLedgerEntriesTable } from "@workspace/db/schemas/drivers/driver-ledger-entries";
import { DriverProfilesTable } from "@workspace/db/schemas/drivers/driver-profiles";
import { UsersTable } from "@workspace/db/schemas/auth/users";
import { CustomerWalletEntriesTable } from "@workspace/db/schemas/wallet/customer-wallet-entries";
import { OrderItemsTable } from "@workspace/db/schemas/orders/order-items";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { markDeliveredSchema, updateLineSchema } from "@workspace/validators/driver";
import { reconcile } from "@workspace/validators/reconciliation";
import { codTotal, lineTotal, round2, toMoney } from "@workspace/validators/totals";
import { inngest } from "@workspace/integrations/inngest/client";

import { createTRPCRouter, driverProcedure } from "../init";
import { applyTransition } from "../lib/order-transitions";

const DRIVER_ACTIVE = ["assigned", "shopping", "purchased", "delivering"] as const;

async function ownedOrder(
  db: Parameters<typeof applyTransition>[0],
  orderId: string,
  driverId: string,
) {
  const order = await db.query.OrdersTable.findFirst({
    where: and(
      eq(OrdersTable.id, orderId),
      eq(OrdersTable.driverId, driverId),
      isNull(OrdersTable.deletedAt),
    ),
  });
  if (!order) throw new TRPCError({ code: "NOT_FOUND" });
  return order;
}

/** Recompute items total from found/substituted lines; COD = items + fee. */
async function recomputeTotals(
  db: Parameters<typeof applyTransition>[0],
  orderId: string,
  actor: string,
) {
  const [sums] = await db
    .select({
      itemsTotal: sql<string>`coalesce(sum(${OrderItemsTable.actualLineTotal}), 0)::numeric(10,2)`,
    })
    .from(OrderItemsTable)
    .where(
      and(
        eq(OrderItemsTable.orderId, orderId),
        inArray(OrderItemsTable.status, ["found", "substituted"]),
      ),
    );

  const order = await db.query.OrdersTable.findFirst({
    where: eq(OrdersTable.id, orderId),
  });
  if (!order) return;

  const itemsTotal = Number(sums?.itemsTotal ?? 0);
  const cod = codTotal(itemsTotal, Number(order.deliveryFee));

  await db
    .update(OrdersTable)
    .set({
      actualItemsTotal: toMoney(itemsTotal),
      codTotal: toMoney(cod),
      updatedBy: actor,
    })
    .where(eq(OrdersTable.id, orderId));

  return { itemsTotal, codTotal: cod };
}

export const driverRouter = createTRPCRouter({
  setAvailability: driverProcedure
    .input(z.object({ isAvailable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(DriverProfilesTable)
        .set({ isAvailable: input.isAvailable, updatedBy: ctx.session.user.id })
        .where(eq(DriverProfilesTable.userId, ctx.session.user.id));
      return { ok: true as const };
    }),

  me: driverProcedure.query(({ ctx }) => ({
    profile: ctx.driverProfile,
  })),

  /** Driver COD balance + recent ledger entries (journey D6). */
  balance: driverProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [profile] = await ctx.db
      .select({ balance: DriverProfilesTable.balance })
      .from(DriverProfilesTable)
      .where(eq(DriverProfilesTable.userId, userId));

    const entries = await ctx.db.query.DriverLedgerEntriesTable.findMany({
      where: eq(DriverLedgerEntriesTable.userId, userId),
      orderBy: desc(DriverLedgerEntriesTable.createdAt),
      limit: 20,
    });

    return { balance: profile?.balance ?? "0.00", entries };
  }),

  myOrders: driverProcedure.query(async ({ ctx }) => {
    const active = await ctx.db.query.OrdersTable.findMany({
      where: and(
        eq(OrdersTable.driverId, ctx.session.user.id),
        inArray(OrdersTable.status, [...DRIVER_ACTIVE]),
        isNull(OrdersTable.deletedAt),
      ),
      with: { items: true },
      orderBy: [asc(OrdersTable.assignedAt)],
    });
    const history = await ctx.db.query.OrdersTable.findMany({
      where: and(
        eq(OrdersTable.driverId, ctx.session.user.id),
        inArray(OrdersTable.status, ["delivered", "cancelled"]),
        isNull(OrdersTable.deletedAt),
      ),
      orderBy: desc(OrdersTable.assignedAt),
      limit: 30,
    });

    // Daily COD recap (journey D6)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayDelivered = history.filter(
      (o) => o.status === "delivered" && o.deliveredAt && o.deliveredAt >= todayStart,
    );
    const todayCod = todayDelivered.reduce(
      (sum, o) => sum + Number(o.codTotal ?? 0),
      0,
    );

    return {
      active,
      history,
      today: { delivered: todayDelivered.length, cod: todayCod },
    };
  }),

  startShopping: driverProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ownedOrder(ctx.db, input.orderId, ctx.session.user.id);
      await applyTransition(ctx.db, order, "shopping", {
        id: ctx.session.user.id,
        role: "driver",
      });
      return { ok: true as const };
    }),

  /** Shopping checklist (journey D4) — price required for found/substituted. */
  updateLine: driverProcedure
    .input(updateLineSchema)
    .mutation(async ({ ctx, input }) => {
      const line = await ctx.db.query.OrderItemsTable.findFirst({
        where: eq(OrderItemsTable.id, input.orderItemId),
        with: { order: true },
      });
      if (!line || line.order.driverId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      // Prices stay editable until the driver starts delivering (D4-U1)
      if (!["shopping", "purchased"].includes(line.order.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "orders.invalidTransition" });
      }

      const resolving = input.status === "found" || input.status === "substituted";
      // Money lines ("buy X EGP worth"): the line total IS the amount spent —
      // there's no per-unit price. It defaults to the requested worth (qty) and
      // the driver can adjust via actualUnitPrice (interpreted as the total).
      const isMoney = line.unitKind === "money";
      const needsPrice = resolving && !isMoney;
      if (needsPrice && input.actualUnitPrice === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "driver.priceRequired" });
      }

      let actualUnitPriceStr: string | null = null;
      let lineTotalStr: string | null = null;
      if (resolving) {
        if (isMoney) {
          const spent = input.actualUnitPrice ?? Number(line.qty);
          lineTotalStr = toMoney(spent);
        } else {
          actualUnitPriceStr = toMoney(input.actualUnitPrice!);
          lineTotalStr = toMoney(lineTotal(input.actualUnitPrice!, Number(line.qty)));
        }
      }

      await ctx.db
        .update(OrderItemsTable)
        .set({
          status: input.status,
          actualUnitPrice: actualUnitPriceStr,
          actualLineTotal: lineTotalStr,
          updatedBy: ctx.session.user.id,
        })
        .where(eq(OrderItemsTable.id, input.orderItemId));

      const totals = await recomputeTotals(
        ctx.db,
        line.orderId,
        ctx.session.user.id,
      );
      return { ok: true as const, totals };
    }),

  doneShopping: driverProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ownedOrder(ctx.db, input.orderId, ctx.session.user.id);

      const [pending] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(OrderItemsTable)
        .where(
          and(
            eq(OrderItemsTable.orderId, order.id),
            eq(OrderItemsTable.status, "pending"),
          ),
        );
      if ((pending?.count ?? 0) > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "driver.linesPending" });
      }

      // Finalize gross totals, then auto-apply any customer wallet credit so the
      // driver collects the reduced COD. Redemption runs ONCE here (shopping is a
      // one-way transition) and is atomic with the purchased transition.
      const totals = await recomputeTotals(ctx.db, order.id, ctx.session.user.id);
      const grossCod = totals?.codTotal ?? Number(order.codTotal ?? 0);

      const [customer] = await ctx.db
        .select({ walletBalance: UsersTable.walletBalance })
        .from(UsersTable)
        .where(eq(UsersTable.id, order.customerId));
      const walletBalance = Number(customer?.walletBalance ?? 0);
      const applied = round2(Math.min(walletBalance, grossCod));
      const netCod = round2(grossCod - applied);

      await applyTransition(
        ctx.db,
        order,
        "purchased",
        { id: ctx.session.user.id, role: "driver" },
        applied > 0
          ? {
              extra: {
                walletApplied: toMoney(applied),
                codTotal: toMoney(netCod),
              },
              onCommit: async (tx) => {
                await tx.insert(CustomerWalletEntriesTable).values({
                  userId: order.customerId,
                  orderId: order.id,
                  amount: toMoney(-applied),
                  reason: "redemption",
                  createdBy: ctx.session.user.id,
                });
                await tx
                  .update(UsersTable)
                  .set({
                    walletBalance: sql`${UsersTable.walletBalance} - ${toMoney(applied)}::numeric`,
                    updatedBy: ctx.session.user.id,
                  })
                  .where(eq(UsersTable.id, order.customerId));
              },
            }
          : {},
      );
      return { ok: true as const, walletApplied: applied, codTotal: netCod };
    }),

  startDelivery: driverProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ownedOrder(ctx.db, input.orderId, ctx.session.user.id);
      await applyTransition(ctx.db, order, "delivering", {
        id: ctx.session.user.id,
        role: "driver",
      });
      return { ok: true as const };
    }),

  markDelivered: driverProcedure
    .input(markDeliveredSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ownedOrder(ctx.db, input.orderId, ctx.session.user.id);

      // Reconcile cash-in-hand against the (net) COD. Overpayment → customer
      // wallet credit; shortfall → a debit on the driver's balance. Both ledger
      // writes + balance bumps are atomic with the delivered transition.
      const { delta, walletCredit, driverShortfall } = reconcile(
        input.amountCollected,
        Number(order.codTotal ?? 0),
      );
      const actor = ctx.session.user.id;

      await applyTransition(
        ctx.db,
        order,
        "delivered",
        { id: actor, role: "driver" },
        {
          extra: {
            deliveredAt: new Date(),
            amountCollected: toMoney(input.amountCollected),
          },
          onCommit:
            delta === 0
              ? undefined
              : async (tx) => {
                  if (walletCredit > 0) {
                    await tx.insert(CustomerWalletEntriesTable).values({
                      userId: order.customerId,
                      orderId: order.id,
                      amount: toMoney(walletCredit),
                      reason: "overpayment",
                      createdBy: actor,
                    });
                    await tx
                      .update(UsersTable)
                      .set({
                        walletBalance: sql`${UsersTable.walletBalance} + ${toMoney(walletCredit)}::numeric`,
                        updatedBy: actor,
                      })
                      .where(eq(UsersTable.id, order.customerId));
                  } else if (driverShortfall > 0 && order.driverId) {
                    await tx.insert(DriverLedgerEntriesTable).values({
                      userId: order.driverId,
                      orderId: order.id,
                      amount: toMoney(-driverShortfall),
                      reason: "shortfall",
                      createdBy: actor,
                    });
                    await tx
                      .update(DriverProfilesTable)
                      .set({
                        balance: sql`${DriverProfilesTable.balance} - ${toMoney(driverShortfall)}::numeric`,
                        updatedBy: actor,
                      })
                      .where(eq(DriverProfilesTable.userId, order.driverId));
                  }
                },
        },
      );

      // Best-effort: tell the customer their wallet was credited.
      if (walletCredit > 0) {
        try {
          await inngest.send({
            id: `wallet-credited:${order.id}`,
            name: "wallet/credited",
            data: {
              userId: order.customerId,
              orderId: order.id,
              amount: walletCredit,
            },
          });
        } catch {
          // notifications are best-effort; the ledger is already correct
        }
      }

      return {
        ok: true as const,
        codTotal: order.codTotal,
        amountCollected: toMoney(input.amountCollected),
        walletCredit,
        driverShortfall,
      };
    }),
});
