"use client";

import { useMemo, useState } from "react";
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
import { Select } from "@workspace/ui/components/select";
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

const UNITS = ["piece", "kg", "gram", "liter", "pack"] as const;
type Unit = (typeof UNITS)[number];

type FormState = {
  id?: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  defaultUnit: Unit;
  imageUrl: string | null;
};

export default function AdminItemsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [form, setForm] = useState<FormState | null>(null);

  const listInput = useMemo(
    () => ({
      search: search || undefined,
      categoryId: categoryId || undefined,
      status: (status || undefined) as
        | "approved"
        | "pending_review"
        | "merged"
        | undefined,
      cursor: 0,
      limit: 50,
    }),
    [search, categoryId, status],
  );

  const listOptions = trpc.admin.catalog.items.list.queryOptions(listInput);
  const { data } = useQuery(listOptions);
  const { data: categories } = useQuery(
    trpc.admin.catalog.categories.list.queryOptions(),
  );

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.admin.catalog.items.list.queryKey(),
    });

  const create = useMutation(
    trpc.admin.catalog.items.create.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setForm(null);
      },
    }),
  );
  const update = useMutation(
    trpc.admin.catalog.items.update.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        setForm(null);
      },
    }),
  );
  const remove = useMutation(
    trpc.admin.catalog.items.delete.mutationOptions({
      onSuccess: () => void invalidateList(),
    }),
  );

  const unitLabel: Record<Unit, string> = {
    piece: t("admin.items.unitPiece"),
    kg: t("admin.items.unitKg"),
    gram: t("admin.items.unitGram"),
    liter: t("admin.items.unitLiter"),
    pack: t("admin.items.unitPack"),
  };

  function submit() {
    if (!form || !form.categoryId) return;
    const payload = {
      categoryId: form.categoryId,
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      defaultUnit: form.defaultUnit,
      imageUrl: form.imageUrl,
    };
    if (form.id) update.mutate({ id: form.id, ...payload });
    else create.mutate(payload);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.items.title")}</h1>
        <Button
          onClick={() =>
            setForm({
              categoryId: categories?.[0]?.id ?? "",
              nameEn: "",
              nameAr: "",
              defaultUnit: "piece",
              imageUrl: null,
            })
          }
        >
          {t("admin.common.add")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("admin.common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">{t("admin.common.allCategories")}</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {locale === "ar" ? c.nameAr : c.nameEn}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("admin.common.allStatuses")}</option>
          <option value="approved">{t("admin.items.statusApproved")}</option>
          <option value="pending_review">{t("admin.items.statusPending")}</option>
          <option value="merged">{t("admin.items.statusMerged")}</option>
        </Select>
        <span className="text-muted-foreground text-sm">
          {t("admin.common.total", { count: String(data?.total ?? 0) })}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.common.image")}</TableHead>
            <TableHead>{t("admin.items.nameAr")}</TableHead>
            <TableHead>{t("admin.items.nameEn")}</TableHead>
            <TableHead>{t("admin.items.category")}</TableHead>
            <TableHead>{t("admin.items.unit")}</TableHead>
            <TableHead>{t("admin.items.status")}</TableHead>
            <TableHead>{t("admin.common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.items ?? []).map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="size-8 rounded object-cover"
                  />
                ) : (
                  <div className="bg-muted size-8 rounded" />
                )}
              </TableCell>
              <TableCell className="font-medium">{item.nameAr ?? "—"}</TableCell>
              <TableCell>{item.nameEn ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {locale === "ar" ? item.category.nameAr : item.category.nameEn}
              </TableCell>
              <TableCell>{unitLabel[item.defaultUnit]}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    item.status === "approved"
                      ? "success"
                      : item.status === "pending_review"
                        ? "warning"
                        : "secondary"
                  }
                >
                  {item.status === "approved"
                    ? t("admin.items.statusApproved")
                    : item.status === "pending_review"
                      ? t("admin.items.statusPending")
                      : t("admin.items.statusMerged")}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      id: item.id,
                      categoryId: item.categoryId,
                      nameEn: item.nameEn ?? "",
                      nameAr: item.nameAr ?? "",
                      defaultUnit: item.defaultUnit,
                      imageUrl: item.imageUrl,
                    })
                  }
                >
                  {t("admin.common.edit")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(t("admin.common.confirmDelete"))) {
                      remove.mutate({ id: item.id });
                    }
                  }}
                >
                  {t("admin.common.delete")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {data?.items.length === 0 ? (
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
              {form?.id ? t("admin.items.editTitle") : t("admin.items.addTitle")}
            </DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("admin.items.nameAr")}</Label>
                <Input
                  dir="rtl"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin.items.nameEn")}</Label>
                <Input
                  dir="ltr"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin.items.category")}</Label>
                <Select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                >
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === "ar" ? c.nameAr : c.nameEn}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin.items.unit")}</Label>
                <Select
                  value={form.defaultUnit}
                  onChange={(e) =>
                    setForm({ ...form, defaultUnit: e.target.value as Unit })
                  }
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unitLabel[unit]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin.common.image")}</Label>
                <ImageUpload
                  value={form.imageUrl}
                  folder="items"
                  onChange={(url) => setForm({ ...form, imageUrl: url })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
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
