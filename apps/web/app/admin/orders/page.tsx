"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { useTRPC } from "@/lib/trpc/client";

const STATUSES = [
  "placed",
  "assigned",
  "shopping",
  "purchased",
  "delivering",
  "delivered",
  "cancelled",
] as const;

function statusVariant(status: string) {
  if (status === "placed") return "warning" as const;
  if (status === "delivered") return "success" as const;
  if (status === "cancelled") return "secondary" as const;
  return "default" as const;
}

export default function AdminOrdersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [status, setStatus] = useState<string>("");
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [cancelFor, setCancelFor] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const listInput = {
    status: (status || undefined) as (typeof STATUSES)[number] | undefined,
    cursor: 0,
    limit: 50,
  };
  const listOptions = trpc.admin.orders.list.queryOptions(listInput);
  const { data } = useQuery({ ...listOptions, refetchInterval: 10_000 });
  const { data: drivers } = useQuery({
    ...trpc.admin.orders.assignableDrivers.queryOptions(),
    enabled: assignFor !== null,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.admin.orders.list.queryKey(),
    });

  const assign = useMutation(
    trpc.admin.orders.assign.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setAssignFor(null);
      },
    }),
  );
  const cancel = useMutation(
    trpc.admin.orders.cancel.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setCancelFor(null);
        setCancelReason("");
      },
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.orders.title")}</h1>
        <select
          className="border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("admin.common.allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`shop.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>{t("admin.orders.customer")}</TableHead>
            <TableHead>{t("admin.orders.items")}</TableHead>
            <TableHead>{t("admin.items.status")}</TableHead>
            <TableHead>{t("admin.orders.driver")}</TableHead>
            <TableHead>{t("admin.orders.codTotal")}</TableHead>
            <TableHead>{t("admin.common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.orders ?? []).map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-bold">#{order.orderNumber}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{order.customer.name ?? "—"}</span>
                  <span className="text-muted-foreground text-xs" dir="ltr">
                    {order.customer.phone}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {order.area}
                  </span>
                </div>
              </TableCell>
              <TableCell>{order.items.length}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(order.status)}>
                  {t(`shop.status.${order.status}`)}
                </Badge>
              </TableCell>
              <TableCell>
                {order.driver?.name ?? t("admin.orders.unassigned")}
              </TableCell>
              <TableCell>{order.codTotal ?? "—"}</TableCell>
              <TableCell className="flex gap-2">
                {["placed", "assigned", "shopping"].includes(order.status) ? (
                  <Button
                    size="sm"
                    variant={order.status === "placed" ? "default" : "outline"}
                    onClick={() => setAssignFor(order.id)}
                  >
                    {order.status === "placed"
                      ? t("admin.orders.assign")
                      : t("admin.orders.reassign")}
                  </Button>
                ) : null}
                {!["delivered", "cancelled"].includes(order.status) ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setCancelFor(order.id)}
                  >
                    {t("shop.cancelOrder")}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
          {data?.orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                {t("admin.common.noResults")}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {/* assign dialog */}
      <Dialog
        open={assignFor !== null}
        onOpenChange={(open) => !open && setAssignFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.orders.assignTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {drivers?.length === 0 ? (
              <p className="text-destructive text-sm">
                {t("admin.orders.noDrivers")}
              </p>
            ) : null}
            {(drivers ?? []).map((driver) => (
              <div
                key={driver.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{driver.user.name}</span>
                  <span className="text-muted-foreground text-xs" dir="ltr">
                    {driver.user.phone}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t("admin.orders.activeOrdersShort", {
                      count: String(driver.activeOrders),
                    })}
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={assign.isPending}
                  onClick={() =>
                    assignFor &&
                    assign.mutate({ orderId: assignFor, driverId: driver.userId })
                  }
                >
                  {t("admin.orders.assign")}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* cancel dialog */}
      <Dialog
        open={cancelFor !== null}
        onOpenChange={(open) => !open && setCancelFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.orders.cancelTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("admin.orders.cancelReason")}
            </label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelFor(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={cancelReason.trim().length < 2 || cancel.isPending}
              onClick={() =>
                cancelFor &&
                cancel.mutate({ orderId: cancelFor, reason: cancelReason.trim() })
              }
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
