"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { OrderStatusBadge } from "@/features/shop/order-status-badge";
import { ACTIVE_ORDER_STATUSES } from "@workspace/validators/order-status";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import type { OrderStatus } from "@workspace/validators/order-status";

export function OrdersClient() {
  const { t } = useTranslation();
  const trpc = useTRPC();

  const [cursor, setCursor] = useState(0);

  const { data, isLoading } = useQuery({
    ...trpc.orders.mine.queryOptions({ cursor }),
    refetchInterval: 15_000,
  });

  const orders = [...(data?.orders ?? [])].sort((a, b) => {
    const aActive = ACTIVE_ORDER_STATUSES.includes(a.status as OrderStatus) ? 0 : 1;
    const bActive = ACTIVE_ORDER_STATUSES.includes(b.status as OrderStatus) ? 0 : 1;
    return aActive - bActive;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-black text-foreground">
        {t("shop.ordersTitle")}
      </h1>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="size-9 text-primary" aria-hidden />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-lg font-bold text-foreground">{t("shop.noOrders")}</p>
            <p className="text-sm text-muted-foreground">{t("shop.noOrdersHint")}</p>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">
            {t("shop.continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="rounded-2xl transition-colors hover:bg-accent active:scale-[0.99]">
                <CardContent className="flex items-center justify-between px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-foreground">
                      {t("shop.orderNumber", {
                        number: String(order.orderNumber),
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.items.length}{" "}
                      {t("driver.itemsCount", {
                        count: String(order.items.length),
                      })}
                      {" • "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data?.nextCursor !== null && data?.nextCursor !== undefined && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setCursor(data.nextCursor!)}
          >
            {t("shop.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
