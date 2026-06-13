"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Row } from "@tanstack/react-table";
import { MoreHorizontalIcon } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { useTranslation } from "@workspace/i18n/react";

import { ImageUpload } from "@/features/admin/image-upload";
import {
  DataTableColumnHeader,
  createEntityActionsColumn,
  createSelectColumn,
} from "@/features/core/data-table";

const UNITS = ["piece", "kg", "gram", "liter", "pack"] as const;
type Unit = (typeof UNITS)[number];

export type ItemRow = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  categoryId: string;
  defaultUnit: Unit;
  status: "approved" | "pending_review" | "merged";
  source: "seed" | "customer" | "admin";
  imageUrl: string | null;
  createdAt: Date;
  category: { id: string; nameEn: string; nameAr: string };
};

export type ItemFormState = {
  id?: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  defaultUnit: Unit;
  imageUrl: string | null;
};

type Translate = ReturnType<typeof useTranslation>["t"];

type BuildColumnsArgs = {
  t: Translate;
  locale: string;
  categoryOptions: { label: string; value: string }[];
  categories: { id: string; nameEn: string; nameAr: string }[];
  editForm: ItemFormState | null;
  setEditForm: (form: ItemFormState | null) => void;
  onFormSubmit: () => void;
  onFormChange: (form: ItemFormState) => void;
  isSubmitting: boolean;
  onDelete: (id: string) => void;
};

function ItemRowActions({
  row,
  t,
  locale,
  categories,
  editForm,
  setEditForm,
  onFormSubmit,
  onFormChange,
  isSubmitting,
  onDelete,
}: { row: Row<ItemRow> } & Omit<BuildColumnsArgs, "categoryOptions">) {
  const item = row.original;
  const isThisFormOpen = editForm?.id === item.id;

  const UNITS_LIST = UNITS;
  const unitLabel: Record<Unit, string> = {
    piece: String(t("admin.items.unitPiece")),
    kg: String(t("admin.items.unitKg")),
    gram: String(t("admin.items.unitGram")),
    liter: String(t("admin.items.unitLiter")),
    pack: String(t("admin.items.unitPack")),
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">{String(t("admin.common.actions"))}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              setEditForm({
                id: item.id,
                categoryId: item.categoryId,
                nameEn: item.nameEn ?? "",
                nameAr: item.nameAr ?? "",
                defaultUnit: item.defaultUnit,
                imageUrl: item.imageUrl,
              })
            }
          >
            {String(t("admin.common.edit"))}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              if (window.confirm(String(t("admin.common.confirmDelete")))) {
                onDelete(item.id);
              }
            }}
          >
            {String(t("admin.common.delete"))}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={isThisFormOpen}
        onOpenChange={(open) => !open && setEditForm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{String(t("admin.items.editTitle"))}</DialogTitle>
          </DialogHeader>
          {editForm && isThisFormOpen ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{String(t("admin.items.nameAr"))}</Label>
                <Input
                  dir="rtl"
                  value={editForm.nameAr}
                  onChange={(e) =>
                    onFormChange({ ...editForm, nameAr: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{String(t("admin.items.nameEn"))}</Label>
                <Input
                  dir="ltr"
                  value={editForm.nameEn}
                  onChange={(e) =>
                    onFormChange({ ...editForm, nameEn: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{String(t("admin.items.category"))}</Label>
                <Select
                  value={editForm.categoryId}
                  onValueChange={(v) => {
                    if (v) onFormChange({ ...editForm, categoryId: v });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {locale === "ar" ? c.nameAr : c.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{String(t("admin.items.unit"))}</Label>
                <Select
                  value={editForm.defaultUnit}
                  onValueChange={(v) => {
                    if (v) onFormChange({ ...editForm, defaultUnit: v as Unit });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS_LIST.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unitLabel[unit]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{String(t("admin.common.image"))}</Label>
                <ImageUpload
                  value={editForm.imageUrl}
                  folder="items"
                  onChange={(url) =>
                    onFormChange({ ...editForm, imageUrl: url })
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditForm(null)}>
              {String(t("common.cancel"))}
            </Button>
            <Button onClick={onFormSubmit} disabled={isSubmitting}>
              {String(t("common.save"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function buildItemColumns(args: BuildColumnsArgs): ColumnDef<ItemRow>[] {
  const {
    t,
    locale,
    categoryOptions,
    categories,
    editForm,
    setEditForm,
    onFormSubmit,
    onFormChange,
    isSubmitting,
    onDelete,
  } = args;

  const unitLabel: Record<Unit, string> = {
    piece: String(t("admin.items.unitPiece")),
    kg: String(t("admin.items.unitKg")),
    gram: String(t("admin.items.unitGram")),
    liter: String(t("admin.items.unitLiter")),
    pack: String(t("admin.items.unitPack")),
  };

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en", {
    dateStyle: "medium",
  });

  return [
    createSelectColumn<ItemRow>(),

    {
      id: "image",
      enableSorting: false,
      enableHiding: true,
      size: 56,
      meta: { label: String(t("admin.common.image")) },
      header: () => (
        <span className="text-xs font-medium text-muted-foreground">
          {String(t("admin.common.image"))}
        </span>
      ),
      cell: ({ row }) =>
        row.original.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.original.imageUrl}
            alt=""
            className="size-8 rounded object-cover"
          />
        ) : (
          <div className="size-8 rounded bg-muted" />
        ),
    },

    {
      id: "nameAr",
      accessorKey: "nameAr",
      enableSorting: true,
      enableHiding: true,
      meta: { label: String(t("admin.items.nameAr")) },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.items.nameAr"))}
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.nameAr ?? "—"}</span>
      ),
    },

    {
      id: "nameEn",
      accessorKey: "nameEn",
      enableSorting: true,
      enableHiding: true,
      meta: { label: String(t("admin.items.nameEn")) },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.items.nameEn"))}
        />
      ),
      cell: ({ row }) => row.original.nameEn ?? "—",
    },

    {
      id: "category",
      enableSorting: false,
      enableHiding: true,
      meta: {
        label: String(t("admin.items.category")),
        filterVariant: "multiSelect" as const,
        options: categoryOptions,
      },
      header: () => (
        <span className="text-xs font-medium text-muted-foreground">
          {String(t("admin.items.category"))}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {locale === "ar"
            ? row.original.category.nameAr
            : row.original.category.nameEn}
        </span>
      ),
    },

    {
      id: "defaultUnit",
      accessorKey: "defaultUnit",
      enableSorting: false,
      enableHiding: true,
      meta: {
        label: String(t("admin.items.unit")),
        filterVariant: "multiSelect" as const,
        options: UNITS.map((u) => ({
          label: unitLabel[u],
          value: u,
        })),
      },
      header: () => (
        <span className="text-xs font-medium text-muted-foreground">
          {String(t("admin.items.unit"))}
        </span>
      ),
      cell: ({ row }) => unitLabel[row.original.defaultUnit],
    },

    {
      id: "status",
      accessorKey: "status",
      enableSorting: true,
      enableHiding: true,
      meta: {
        label: String(t("admin.items.status")),
        filterVariant: "multiSelect" as const,
        options: [
          {
            label: String(t("admin.items.statusApproved")),
            value: "approved",
          },
          {
            label: String(t("admin.items.statusPending")),
            value: "pending_review",
          },
          {
            label: String(t("admin.items.statusMerged")),
            value: "merged",
          },
        ],
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.items.status"))}
        />
      ),
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge
            variant={
              s === "approved"
                ? "success"
                : s === "pending_review"
                  ? "warning"
                  : "secondary"
            }
          >
            {s === "approved"
              ? String(t("admin.items.statusApproved"))
              : s === "pending_review"
                ? String(t("admin.items.statusPending"))
                : String(t("admin.items.statusMerged"))}
          </Badge>
        );
      },
    },

    {
      id: "source",
      accessorKey: "source",
      enableSorting: false,
      enableHiding: true,
      meta: {
        label: String(t("admin.items.source")),
        filterVariant: "multiSelect" as const,
        options: [
          { label: "seed", value: "seed" },
          { label: "customer", value: "customer" },
          { label: "admin", value: "admin" },
        ],
      },
      header: () => (
        <span className="text-xs font-medium text-muted-foreground">
          {String(t("admin.items.source"))}
        </span>
      ),
      cell: ({ row }) => row.original.source,
    },

    {
      id: "createdAt",
      accessorKey: "createdAt",
      enableSorting: true,
      enableHiding: true,
      meta: {
        label: String(t("admin.common.created")),
        filterVariant: "dateRange" as const,
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("admin.common.created"))}
        />
      ),
      cell: ({ row }) => dateFmt.format(new Date(row.original.createdAt)),
    },

    createEntityActionsColumn<ItemRow>({
      t,
      cell: ({ row }) => (
        <ItemRowActions
          row={row}
          t={t}
          locale={locale}
          categories={categories}
          editForm={editForm}
          setEditForm={setEditForm}
          onFormSubmit={onFormSubmit}
          onFormChange={onFormChange}
          isSubmitting={isSubmitting}
          onDelete={onDelete}
        />
      ),
    }),
  ];
}
