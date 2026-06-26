"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-form";
import { TRPCClientError } from "@trpc/client";

import { useTranslation } from "@workspace/i18n/react";
import { defaultQtyForKind } from "@workspace/validators/units";
import { useTRPC } from "@/lib/trpc/client";
import { useAppForm } from "@/components/forms/hooks";
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

  const { data: categories } = useQuery(trpc.catalog.categories.queryOptions());
  const { data: units } = useQuery(trpc.catalog.units.queryOptions());

  const createItem = useMutation(
    trpc.items.create.mutationOptions({
      onSuccess: (data, variables) => {
        const msg = data.matched
          ? t("shop.addItem.foundExisting")
          : t("shop.addItem.added");
        toast.success(msg);
        const chosen = (units ?? []).find((u) => u.id === variables.unitId);
        if (chosen) {
          add(
            {
              itemId: data.item.id,
              nameEn: data.item.nameEn,
              nameAr: data.item.nameAr,
              units: [
                {
                  id: chosen.id,
                  code: chosen.code,
                  nameEn: chosen.nameEn,
                  nameAr: chosen.nameAr,
                  kind: chosen.kind,
                },
              ],
              unitId: chosen.id,
            },
            defaultQtyForKind(chosen.kind),
          );
        }
        void queryClient.invalidateQueries({
          queryKey: trpc.catalog.search.queryKey(),
        });
        setOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast.error(trpcErrorMessage(err, (k) => String(t(k as never))));
      },
    }),
  );

  const form = useAppForm({
    defaultValues: { name: "", categoryId: "", unitId: "" },
    onSubmit: async ({ value }) => {
      await createItem.mutateAsync({
        name: value.name.trim(),
        categoryId: value.categoryId,
        unitId: value.unitId,
      });
    },
  });

  const name = useStore(form.baseStore, (s) => s.values.name);

  const categoryOptions = useMemo(
    () =>
      (categories ?? []).map((c) => ({
        value: c.id,
        label: geoName(c, c.nameAr ?? c.nameEn ?? c.id, locale),
      })),
    [categories, locale],
  );

  const unitOptions = useMemo(
    () =>
      (units ?? []).map((u) => ({
        value: u.id,
        label: locale === "ar" ? (u.nameAr ?? u.nameEn ?? u.id) : (u.nameEn ?? u.id),
      })),
    [units, locale],
  );

  // Default the unit picker to the first active unit once loaded.
  if (units && units.length > 0 && !form.getFieldValue("unitId")) {
    form.setFieldValue("unitId", units[0]!.id);
  }

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.AppField
            name="name"
            validators={{
              onSubmit: ({ value }) =>
                value.trim() ? undefined : "validation.required",
            }}
          >
            {(field) => (
              <field.StringField
                label={name ? `"${name}"` : t("shop.addItem.title")}
                placeholder={t("shop.searchPlaceholder")}
                autoFocus
              />
            )}
          </form.AppField>

          <form.AppField
            name="categoryId"
            validators={{
              onSubmit: ({ value }) =>
                value ? undefined : "validation.required",
            }}
          >
            {(field) => (
              <field.SelectField
                label={t("shop.addItem.category")}
                options={categoryOptions}
                placeholder={t("shop.addItem.category")}
              />
            )}
          </form.AppField>

          <form.AppField name="unitId">
            {(field) => (
              <field.SelectField
                label={t("shop.addItem.unit")}
                options={unitOptions}
                placeholder={t("shop.addItem.unit")}
              />
            )}
          </form.AppField>

          <Button type="submit" disabled={createItem.isPending}>
            {createItem.isPending
              ? t("shop.addItem.adding")
              : t("shop.addItem.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
