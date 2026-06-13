"use client";

import type { ColumnDef, Row } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import type { Dispatch, SetStateAction } from "react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import type { AppRouter } from "@workspace/api/root";
import { useTranslation } from "@workspace/i18n/react";
import {
  createEntityActionsColumn,
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";

import type { OrderRowAction } from "./orders-table";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type OrderRow =
  RouterOutput["admin"]["orders"]["list"]["rows"][number];

type Translate = ReturnType<typeof useTranslation>["t"];

function statusVariant(
  status: string,
): "warning" | "success" | "secondary" | "default" | "destructive" {
  if (status === "placed") return "warning";
  if (status === "delivered") return "success";
  if (status === "cancelled") return "secondary";
  return "default";
}

const ORDER_STATUSES = [
  "placed",
  "assigned",
  "shopping",
  "purchased",
  "delivering",
  "delivered",
  "cancelled",
] as const;

function statusLabel(t: Translate, status: string): string {
  const found = ORDER_STATUSES.find((s) => s === status);
  if (found === "placed") return String(t("shop.status.placed"));
  if (found === "assigned") return String(t("shop.status.assigned"));
  if (found === "shopping") return String(t("shop.status.shopping"));
  if (found === "purchased") return String(t("shop.status.purchased"));
  if (found === "delivering") return String(t("shop.status.delivering"));
  if (found === "delivered") return String(t("shop.status.delivered"));
  if (found === "cancelled") return String(t("shop.status.cancelled"));
  return status;
}

function OrderRowActions({
  row,
  setRowAction,
}: {
  row: OrderRow;
  setRowAction: Dispatch<SetStateAction<OrderRowAction | null>>;
}) {
  const { t } = useTranslation();
  const canAssign = ["placed", "assigned", "shopping"].includes(row.status);
  const canCancel = !["delivered", "cancelled"].includes(row.status);

  return (
    <div className="flex items-center gap-1">
      {canAssign ? (
        <Button
          size="sm"
          variant={row.status === "placed" ? "default" : "outline"}
          className="h-7 px-2 text-xs"
          onClick={() => setRowAction({ row, variant: "assign" })}
        >
          {row.status === "placed"
            ? String(t("admin.orders.assign"))
            : String(t("admin.orders.reassign"))}
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          onClick={() => setRowAction({ row, variant: "cancel" })}
        >
          {String(t("shop.cancelOrder"))}
        </Button>
      ) : null}
    </div>
  );
}

export function buildOrderColumns(opts: {
  locale: string;
  t: Translate;
  setRowAction: Dispatch<SetStateAction<OrderRowAction | null>>;
}): ColumnDef<OrderRow>[] {
  const { locale, t, setRowAction } = opts;

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
  });

  const moneyFmt = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    maximumFractionDigits: 0,
  });

  const statusOptions = ORDER_STATUSES.map((s) => ({
    value: s,
    label: statusLabel(t, s),
  }));

  return [
    createSelectColumn<OrderRow>(),
    {
      accessorKey: "orderNumber",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="#" />
      ),
      meta: { label: "#" },
      cell: ({ row }) => (
        <span className="font-bold">#{row.original.orderNumber}</span>
      ),
    },
    {
      id: "customer",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.orders.customer"))}
        </span>
      ),
      meta: { label: String(t("admin.orders.customer")) },
      cell: ({ row }) => {
        const c = row.original.customer;
        return (
          <div className="flex flex-col">
            <span>{c?.name ?? "—"}</span>
            <span className="text-muted-foreground text-xs" dir="ltr">
              {c?.phone ?? ""}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "area",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("address.area"))}
        </span>
      ),
      meta: {
        label: String(t("address.area")),
        filterVariant: "text" as const,
      },
      cell: ({ row }) => row.original.area ?? "—",
    },
    {
      accessorKey: "status",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.items.status"))}
        />
      ),
      meta: {
        label: String(t("admin.items.status")),
        filterVariant: "multiSelect" as const,
        options: statusOptions,
      },
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {statusLabel(t, row.original.status)}
        </Badge>
      ),
    },
    {
      id: "driver",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.orders.driver"))}
        </span>
      ),
      meta: { label: String(t("admin.orders.driver")) },
      cell: ({ row }) =>
        row.original.driver?.name ?? String(t("admin.orders.unassigned")),
    },
    {
      id: "items",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.orders.items"))}
        </span>
      ),
      meta: { label: String(t("admin.orders.items")) },
      cell: ({ row }) => row.original.items.length,
    },
    {
      accessorKey: "codTotal",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.orders.codTotal"))}
        />
      ),
      meta: {
        label: String(t("admin.orders.codTotal")),
        filterVariant: "numberRange" as const,
      },
      cell: ({ row }) => {
        const v = row.original.codTotal;
        if (v == null) return "—";
        const n = Number(v);
        return Number.isFinite(n) ? moneyFmt.format(n) : v;
      },
    },
    {
      accessorKey: "createdAt",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.orders.created"))}
        />
      ),
      meta: {
        label: String(t("admin.orders.created")),
        filterVariant: "dateRange" as const,
      },
      cell: ({ row }) =>
        row.original.createdAt
          ? dateFmt.format(new Date(row.original.createdAt))
          : "—",
    },
    createEntityActionsColumn<OrderRow>({
      t,
      size: 180,
      cell: ({ row }: { row: Row<OrderRow> }) => (
        <OrderRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
