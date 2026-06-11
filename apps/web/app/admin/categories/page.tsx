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
import { Label } from "@workspace/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { ImageUpload } from "@/features/admin/image-upload";
import { useTRPC } from "@/lib/trpc/client";

type CategoryRow = {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  id?: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: FormState = {
  nameEn: "",
  nameAr: "",
  slug: "",
  imageUrl: null,
  sortOrder: 0,
  isActive: true,
};

export default function AdminCategoriesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState | null>(null);

  const listOptions = trpc.admin.catalog.categories.list.queryOptions();
  const { data: categories } = useQuery(listOptions);

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey });

  const create = useMutation(
    trpc.admin.catalog.categories.create.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setForm(null);
      },
    }),
  );
  const update = useMutation(
    trpc.admin.catalog.categories.update.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setForm(null);
      },
    }),
  );
  const remove = useMutation(
    trpc.admin.catalog.categories.delete.mutationOptions({
      onSuccess: () => void invalidateList(),
    }),
  );

  function submit() {
    if (!form) return;
    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      slug: form.slug,
      imageUrl: form.imageUrl,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    if (form.id) update.mutate({ id: form.id, ...payload });
    else create.mutate(payload);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.categories.title")}</h1>
        <Button onClick={() => setForm(emptyForm)}>
          {t("admin.common.add")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.common.image")}</TableHead>
            <TableHead>{t("admin.categories.nameAr")}</TableHead>
            <TableHead>{t("admin.categories.nameEn")}</TableHead>
            <TableHead>{t("admin.categories.slug")}</TableHead>
            <TableHead>{t("admin.categories.sortOrder")}</TableHead>
            <TableHead>{t("admin.items.status")}</TableHead>
            <TableHead>{t("admin.common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(categories ?? []).map((category: CategoryRow) => (
            <TableRow key={category.id}>
              <TableCell>
                {category.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.imageUrl}
                    alt=""
                    className="size-8 rounded object-cover"
                  />
                ) : (
                  <div className="bg-muted size-8 rounded" />
                )}
              </TableCell>
              <TableCell className="font-medium">{category.nameAr}</TableCell>
              <TableCell>{category.nameEn}</TableCell>
              <TableCell className="text-muted-foreground">
                {category.slug}
              </TableCell>
              <TableCell>{category.sortOrder}</TableCell>
              <TableCell>
                <Badge variant={category.isActive ? "success" : "secondary"}>
                  {category.isActive
                    ? t("admin.common.active")
                    : t("admin.common.inactive")}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ ...category })}
                >
                  {t("admin.common.edit")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(t("admin.common.confirmDelete"))) {
                      remove.mutate({ id: category.id });
                    }
                  }}
                >
                  {t("admin.common.delete")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {categories?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                {t("admin.common.noResults")}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form?.id
                ? t("admin.categories.editTitle")
                : t("admin.categories.addTitle")}
            </DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("admin.categories.nameAr")}</Label>
                <Input
                  dir="rtl"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin.categories.nameEn")}</Label>
                <Input
                  dir="ltr"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin.categories.slug")}</Label>
                <Input
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin.categories.sortOrder")}</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin.common.image")}</Label>
                <ImageUpload
                  value={form.imageUrl}
                  folder="categories"
                  onChange={(url) => setForm({ ...form, imageUrl: url })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                {t("admin.categories.isActive")}
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForm(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submit}
              disabled={create.isPending || update.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
