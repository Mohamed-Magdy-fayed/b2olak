"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { addressLabel, addressSummary } from "@/features/shop/helpers";
import { AddressForm } from "@/features/shop/address-form";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

type EditTarget = {
  id: string;
  label: string | null;
  cityId: string | null;
  districtId: string | null;
  areaId: string | null;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  contactPhone: string;
  isDefault: boolean;
};

export function AddressesClient() {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const { data: addresses, isLoading } = useQuery(
    trpc.addresses.list.queryOptions(),
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.addresses.list.queryKey(),
    });

  const remove = useMutation(
    trpc.addresses.delete.mutationOptions({
      onSuccess: () => void invalidate(),
      onError: () => toast.error(t("errors.unknown")),
    }),
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/account"
          className="flex size-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
        >
          {locale === "ar" ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Link>
        <h1 className="text-2xl font-black text-foreground">
          {t("address.title")}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (addresses ?? []).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t("address.none")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {(addresses ?? []).map((address) => (
            <Card key={address.id}>
              <CardContent className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {addressLabel(address, locale)}
                    </span>
                    {address.isDefault && (
                      <Badge variant="secondary">{t("address.isDefault")}</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {addressSummary(address, locale)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditTarget(address)}
                  >
                    {t("admin.common.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (
                        window.confirm(t("admin.common.confirmDelete"))
                      ) {
                        remove.mutate({ id: address.id });
                      }
                    }}
                    disabled={remove.isPending}
                  >
                    {t("address.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button className="mt-4 w-full" onClick={() => setAddOpen(true)}>
        + {t("address.add")}
      </Button>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("address.add")}</DialogTitle>
          </DialogHeader>
          <AddressForm
            onSuccess={() => {
              setAddOpen(false);
              void invalidate();
            }}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("address.edit")}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <AddressForm
              initialValues={editTarget}
              onSuccess={() => {
                setEditTarget(null);
                void invalidate();
              }}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
