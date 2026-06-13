"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { useCart } from "@/features/shop/cart-store";
import { geoName } from "@/features/shop/helpers";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

const UNITS = ["piece", "kg", "gram", "liter", "pack"] as const;
type Unit = (typeof UNITS)[number];

function trpcErrorMessage(error: unknown, t: (k: string) => string): string {
  if (error instanceof TRPCClientError) {
    const msg = error.message;
    if (msg.includes(".")) return t(msg);
    if (error.data?.code === "TOO_MANY_REQUESTS")
      return t("errors.tooManyRequests");
  }
  return t("errors.unknown");
}

export function AddItemDialog() {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const add = useCart((s) => s.add);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState<Unit>("piece");

  const { data: categories } = useQuery(trpc.catalog.categories.queryOptions());

  const createItem = useMutation(
    trpc.items.create.mutationOptions({
      onSuccess: (data) => {
        const msg = data.matched
          ? t("shop.addItem.foundExisting")
          : t("shop.addItem.added");
        toast.success(msg);
        add({
          itemId: data.item.id,
          nameEn: data.item.nameEn,
          nameAr: data.item.nameAr,
          unit: data.item.defaultUnit as Unit,
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.catalog.search.queryKey(),
        });
        setOpen(false);
        setName("");
        setCategoryId("");
        setUnit("piece");
      },
      onError: (err) => {
        toast.error(trpcErrorMessage(err, (k) => String(t(k as never))));
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="inline-flex w-full items-center justify-center rounded-md border border-dashed border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
            + {t("shop.addItem.cta")}
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("shop.addItem.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-item-name">{name ? `"${name}"` : t("shop.addItem.title")}</Label>
            <Input
              id="add-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("shop.searchPlaceholder")}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("shop.addItem.category")}</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={t("shop.addItem.category")} />
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {geoName(c, c.nameAr ?? c.nameEn ?? c.id, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("shop.addItem.unit")}</Label>
            <Select
              value={unit}
              onValueChange={(v) => setUnit(v as Unit)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {t(`units.${u}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => {
              if (!name.trim() || !categoryId) return;
              createItem.mutate({
                name: name.trim(),
                categoryId,
                defaultUnit: unit,
              });
            }}
            disabled={createItem.isPending || !name.trim() || !categoryId}
          >
            {createItem.isPending
              ? t("shop.addItem.adding")
              : t("shop.addItem.submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
