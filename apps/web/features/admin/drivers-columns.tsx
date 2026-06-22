"use client";

import type { ColumnDef, Row } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import type { Dispatch, SetStateAction } from "react";

import { MoreHorizontalIcon } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import type { AppRouter } from "@workspace/api/root";
import { useTranslation } from "@workspace/i18n/react";
import {
  createEntityActionsColumn,
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";

import type { DriverRowAction } from "./drivers-table";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type DriverRow =
  RouterOutput["admin"]["drivers"]["list"]["rows"][number];

type Translate = ReturnType<typeof useTranslation>["t"];

const DRIVER_STATUSES = ["pending", "approved", "suspended"] as const;
const VEHICLE_TYPES = ["motorcycle", "bicycle", "car", "on_foot"] as const;

type VehicleKey =
  | "vehicleMotorcycle"
  | "vehicleBicycle"
  | "vehicleCar"
  | "vehicleOnFoot";

const vehicleKeyMap: Record<(typeof VEHICLE_TYPES)[number], VehicleKey> = {
  motorcycle: "vehicleMotorcycle",
  bicycle: "vehicleBicycle",
  car: "vehicleCar",
  on_foot: "vehicleOnFoot",
};

function driverStatusVariant(
  status: string,
): "success" | "warning" | "destructive" | "default" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "suspended") return "destructive";
  return "default";
}

function DriverRowActions({
  row,
  setRowAction,
}: {
  row: DriverRow;
  setRowAction: Dispatch<SetStateAction<DriverRowAction | null>>;
}) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">
              {String(t("admin.common.actions"))}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {row.status === "pending" ? (
          <DropdownMenuItem
            onClick={() => setRowAction({ row, variant: "approve" })}
          >
            {String(t("admin.drivers.approve"))}
          </DropdownMenuItem>
        ) : null}
        {row.status !== "suspended" ? (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setRowAction({ row, variant: "suspend" })}
          >
            {String(t("admin.drivers.suspend"))}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => setRowAction({ row, variant: "reactivate" })}
          >
            {String(t("admin.drivers.reactivate"))}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildDriverColumns(opts: {
  locale: string;
  t: Translate;
  setRowAction: Dispatch<SetStateAction<DriverRowAction | null>>;
}): ColumnDef<DriverRow>[] {
  const { locale, t, setRowAction } = opts;

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
  });

  const driverStatusOptions = DRIVER_STATUSES.map((s) => ({
    value: s,
    label: String(
      t(
        s === "approved"
          ? "admin.drivers.statusApproved"
          : s === "pending"
            ? "admin.drivers.statusPending"
            : "admin.drivers.statusSuspended",
      ),
    ),
  }));

  const vehicleTypeOptions = VEHICLE_TYPES.map((v) => ({
    value: v,
    label: String(t(`admin.drivers.${vehicleKeyMap[v]}`)),
  }));

  const availabilityOptions = [
    { value: "true", label: String(t("admin.drivers.available")) },
    { value: "false", label: String(t("admin.drivers.offline")) },
  ];

  return [
    createSelectColumn<DriverRow>(),
    {
      id: "name",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.drivers.name"))}
        </span>
      ),
      meta: { label: String(t("admin.drivers.name")) },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.user?.name ?? "—"}</span>
      ),
    },
    {
      id: "phone",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.drivers.phone"))}
        </span>
      ),
      meta: { label: String(t("admin.drivers.phone")) },
      cell: ({ row }) => (
        <span dir="ltr">{row.original.user?.phone ?? "—"}</span>
      ),
    },
    {
      accessorKey: "vehicleType",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.drivers.vehicle"))}
        </span>
      ),
      meta: {
        label: String(t("admin.drivers.vehicle")),
        filterVariant: "multiSelect" as const,
        options: vehicleTypeOptions,
      },
      cell: ({ row }) => {
        const vt = row.original.vehicleType;
        const key = vehicleKeyMap[vt] ?? "vehicleMotorcycle";
        const label = String(t(`admin.drivers.${key}`));
        const plate = row.original.vehiclePlate;
        return plate ? `${label} • ${plate}` : label;
      },
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
        options: driverStatusOptions,
      },
      cell: ({ row }) => (
        <Badge variant={driverStatusVariant(row.original.status)}>
          {row.original.status === "approved"
            ? String(t("admin.drivers.statusApproved"))
            : row.original.status === "pending"
              ? String(t("admin.drivers.statusPending"))
              : String(t("admin.drivers.statusSuspended"))}
        </Badge>
      ),
    },
    {
      accessorKey: "isAvailable",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.drivers.available"))}
        </span>
      ),
      meta: {
        label: String(t("admin.drivers.available")),
        filterVariant: "multiSelect" as const,
        options: availabilityOptions,
      },
      cell: ({ row }) => (
        <Badge variant={row.original.isAvailable ? "success" : "secondary"}>
          {row.original.isAvailable
            ? String(t("admin.drivers.available"))
            : String(t("admin.drivers.offline"))}
        </Badge>
      ),
    },
    {
      accessorKey: "activeOrders",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.drivers.active"))}
        </span>
      ),
      meta: { label: String(t("admin.drivers.active")) },
      cell: ({ row }) => row.original.activeOrders,
    },
    {
      accessorKey: "deliveredOrders",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.drivers.delivered"))}
        </span>
      ),
      meta: { label: String(t("admin.drivers.delivered")) },
      cell: ({ row }) => row.original.deliveredOrders,
    },
    {
      accessorKey: "createdAt",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.users.created"))}
        />
      ),
      meta: {
        label: String(t("admin.users.created")),
        filterVariant: "dateRange" as const,
      },
      cell: ({ row }) =>
        row.original.createdAt
          ? dateFmt.format(new Date(row.original.createdAt))
          : "—",
    },
    createEntityActionsColumn<DriverRow>({
      t,
      size: 56,
      cell: ({ row }: { row: Row<DriverRow> }) => (
        <DriverRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
