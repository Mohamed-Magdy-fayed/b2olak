"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { formatQty, isMoneyKind } from "@workspace/validators/units";
import { useTRPC } from "@/lib/trpc/client";
import { OrderTimeline } from "@/features/shop/order-timeline";
import { OrderStatusBadge } from "@/features/shop/order-status-badge";
import {
  StickyActionBar,
  stickyActionBarSpacerClassName,
} from "@/components/sticky-action-bar";
import {
  ACTIVE_ORDER_STATUSES,
  canCustomerEditItems,
  canTransition,
} from "@workspace/validators/order-status";
import type { OrderStatus } from "@workspace/validators/order-status";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const orderOptions = trpc.orders.byId.queryOptions({ orderId });

  const { data: order, isLoading } = useQuery({
    ...orderOptions,
    refetchInterval: (query) => {
      const status = query.state.data?.status as OrderStatus | undefined;
      return status && ACTIVE_ORDER_STATUSES.includes(status) ? 5_000 : false;
    },
  });

  const cancel = useMutation(
    trpc.orders.cancel.mutationOptions({
      onSuccess: () => {
        toast.success(t("shop.cancelled"));
        setCancelOpen(false);
        void queryClient.invalidateQueries({ queryKey: orderOptions.queryKey });
        void queryClient.invalidateQueries({
          queryKey: trpc.orders.mine.queryKey(),
        });
      },
      onError: () => {
        toast.error(t("errors.unknown"));
      },
    }),
  );

  const editable = order
    ? canCustomerEditItems(order.status as OrderStatus)
    : false;

  const { data: unitOptions } = useQuery({
    ...trpc.orders.lineUnitOptions.queryOptions({ orderId }),
    enabled: editable,
  });

  const updateLineUnit = useMutation(
    trpc.orders.updateLineUnit.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orderOptions.queryKey });
      },
      onError: () => {
        toast.error(t("errors.unknown"));
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!order) return null;

  const status = order.status as OrderStatus;
  const canCancel = canTransition(status, "cancelled", "customer");

  return (
    <div
      className={`mx-auto flex max-w-xl flex-col gap-6 px-4 pt-8 ${
        canCancel ? stickyActionBarSpacerClassName : "pb-8"
      }`}
    >
      <div className="flex items-center gap-3">
        <Link
          href="/orders"
          className="flex size-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
        >
          {locale === "ar" ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Link>
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-black text-foreground">
            {t("shop.orderNumber", { number: String(order.orderNumber) })}
          </h1>
          <OrderStatusBadge status={status} />
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.orders.timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline
            statusEvents={order.statusEvents}
            status={order.status}
          />
          {order.driver?.name && status !== "cancelled" && (
            <p className="mt-3 text-sm text-muted-foreground">
              🛵 {order.driver.name}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardContent className="flex flex-col gap-2 pt-6">
          {order.items.map((line) => {
            const name =
              (locale === "ar"
                ? line.nameSnapshotAr
                : line.nameSnapshotEn) ??
              line.nameSnapshotAr ??
              line.nameSnapshotEn ??
              "—";
            const unavailable = line.status === "unavailable";
            const lineUnits = unitOptions?.[line.id] ?? [];
            const canEditUnit = editable && lineUnits.length > 1;
            const money = isMoneyKind(line.unitKind);
            // Money lines read "10 EGP worth"; the Select shows "EGP worth" so
            // the inline prefix is just the amount (no fraction/"×").
            const qtyPrefix = money
              ? String(Number(line.qty))
              : formatQty(Number(line.qty), line.unitKind);
            return (
              <div
                key={line.id}
                className="flex items-center justify-between gap-2"
              >
                {canEditUnit ? (
                  <span className="flex flex-1 items-center gap-1.5 text-sm text-foreground">
                    {name} — {qtyPrefix}
                    <Select
                      value={line.unit}
                      onValueChange={(v) =>
                        v &&
                        v !== line.unit &&
                        updateLineUnit.mutate({
                          orderId: order.id,
                          orderItemId: line.id,
                          unit: v,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-auto gap-1 px-2 py-0 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {lineUnits.map((code) => (
                          <SelectItem key={code} value={code}>
                            {t(`units.${code}` as never)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </span>
                ) : (
                  <span
                    className={`flex-1 text-sm ${unavailable ? "text-muted-foreground line-through" : "text-foreground"}`}
                  >
                    {name} —{" "}
                    {money
                      ? t("shop.egpWorth", { amount: Number(line.qty) })
                      : `${qtyPrefix} ${t(`units.${line.unit}` as never)}`}
                  </span>
                )}
                {line.status !== "pending" && (
                  <span
                    className={`text-xs font-semibold ${unavailable ? "text-destructive" : "text-emerald-600"}`}
                  >
                    {t(`shop.lineStatus.${line.status}` as never)}
                    {line.actualLineTotal
                      ? ` • ${line.actualLineTotal} EGP`
                      : ""}
                  </span>
                )}
              </div>
            );
          })}

          <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("shop.deliveryFee")}</span>
              <span className="text-foreground">{order.deliveryFee} EGP</span>
            </div>
            {order.codTotal && (
              <div className="flex justify-between text-sm">
                <span className="font-bold text-foreground">{t("shop.codTotal")}</span>
                <span className="text-base font-black text-primary">
                  {order.codTotal} EGP
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel */}
      {canCancel && (
        <StickyActionBar>
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger
            render={
              <button className="inline-flex w-full items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90">
                {t("shop.cancelOrder")}
              </button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("shop.cancelOrder")}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t("shop.cancelConfirm")}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cancel-reason">{t("admin.orders.cancelReason")}</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={
                  <button className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
                    {t("common.cancel")}
                  </button>
                }
              />
              <Button
                variant="destructive"
                onClick={() =>
                  cancel.mutate({
                    orderId: order.id,
                    reason: cancelReason.trim() || undefined,
                  })
                }
                disabled={cancel.isPending}
              >
                {t("common.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </StickyActionBar>
      )}
    </div>
  );
}
