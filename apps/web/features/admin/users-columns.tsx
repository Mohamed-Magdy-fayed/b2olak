"use client";

import type { ColumnDef, Row } from "@tanstack/react-table";
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
import { useTranslation } from "@workspace/i18n/react";
import {
  createEntityActionsColumn,
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";

import type { UserRowAction } from "./users-table";

export type UserRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  preferredLocale: string | null;
  phoneVerifiedAt: Date | null;
  lastSignInAt: Date | null;
  createdAt: Date;
};

type Translate = ReturnType<typeof useTranslation>["t"];

function userStatusVariant(
  status: string,
): "success" | "warning" | "destructive" | "default" | "secondary" {
  if (status === "active") return "success";
  if (status === "suspended") return "destructive";
  return "secondary";
}

function UserRowActions({
  row,
  setRowAction,
}: {
  row: UserRow;
  setRowAction: Dispatch<SetStateAction<UserRowAction | null>>;
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
        {row.status !== "suspended" ? (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setRowAction({ row, variant: "suspend" })}
          >
            {String(t("admin.users.suspend"))}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => setRowAction({ row, variant: "reactivate" })}
          >
            {String(t("admin.users.reactivate"))}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildUserColumns(opts: {
  locale: string;
  t: Translate;
  setRowAction: Dispatch<SetStateAction<UserRowAction | null>>;
}): ColumnDef<UserRow>[] {
  const { locale, t, setRowAction } = opts;

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
  });

  const userStatusOptions = [
    { value: "active", label: String(t("admin.common.active")) },
    { value: "suspended", label: String(t("admin.drivers.statusSuspended")) },
  ];

  const localeOptions = [
    { value: "en", label: "EN" },
    { value: "ar", label: "العربية" },
  ];

  const phoneVerifiedOptions = [
    { value: "true", label: String(t("admin.users.verified")) },
    { value: "false", label: String(t("admin.users.notVerified")) },
  ];

  return [
    createSelectColumn<UserRow>(),
    {
      accessorKey: "name",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.users.name"))}
        />
      ),
      meta: { label: String(t("admin.users.name")) },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name ?? "—"}</span>
      ),
    },
    {
      accessorKey: "phone",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.users.phone"))}
        </span>
      ),
      meta: { label: String(t("admin.users.phone")) },
      cell: ({ row }) => (
        <span dir="ltr">{row.original.phone ?? "—"}</span>
      ),
    },
    {
      accessorKey: "email",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.users.email"))}
        </span>
      ),
      meta: { label: String(t("admin.users.email")) },
      cell: ({ row }) => row.original.email ?? "—",
    },
    {
      accessorKey: "phoneVerifiedAt",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.users.verified"))}
        </span>
      ),
      meta: {
        label: String(t("admin.users.verified")),
        filterVariant: "multiSelect" as const,
        options: phoneVerifiedOptions,
      },
      cell: ({ row }) => {
        const verified = row.original.phoneVerifiedAt !== null;
        return (
          <Badge variant={verified ? "success" : "secondary"}>
            {verified
              ? String(t("admin.users.verified"))
              : String(t("admin.users.notVerified"))}
          </Badge>
        );
      },
    },
    {
      accessorKey: "preferredLocale",
      enableSorting: false,
      header: () => (
        <span className="text-xs font-medium">
          {String(t("admin.users.locale"))}
        </span>
      ),
      meta: {
        label: String(t("admin.users.locale")),
        filterVariant: "multiSelect" as const,
        options: localeOptions,
      },
      cell: ({ row }) =>
        row.original.preferredLocale
          ? row.original.preferredLocale.toUpperCase()
          : "—",
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
        options: userStatusOptions,
      },
      cell: ({ row }) => (
        <Badge variant={userStatusVariant(row.original.status)}>
          {row.original.status === "active"
            ? String(t("admin.common.active"))
            : String(t("admin.drivers.statusSuspended"))}
        </Badge>
      ),
    },
    {
      accessorKey: "lastSignInAt",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.users.lastSignIn"))}
        />
      ),
      meta: {
        label: String(t("admin.users.lastSignIn")),
        filterVariant: "dateRange" as const,
      },
      cell: ({ row }) =>
        row.original.lastSignInAt
          ? dateFmt.format(new Date(row.original.lastSignInAt))
          : "—",
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
    createEntityActionsColumn<UserRow>({
      t,
      size: 56,
      cell: ({ row }: { row: Row<UserRow> }) => (
        <UserRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
