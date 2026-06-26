"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { formatQty, isMoneyKind } from "@workspace/validators/units";
import { useTRPC } from "@/lib/trpc/client";
import { cartLineUnit, cartLineUnitName, useCart } from "@/features/shop/cart-store";
import { itemDisplayName, addressLabel, addressSummary } from "@/features/shop/helpers";
import { PhoneVerifyCard } from "@/features/shop/phone-verify-card";
import { AddressForm } from "@/features/shop/address-form";
import {
  StickyActionBar,
  stickyActionBarSpacerClassName,
} from "@/components/sticky-action-bar";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

function trpcErrorMessage(error: unknown, t: (k: string) => string): string {
  if (error instanceof TRPCClientError) {
    if (error.data?.code === "TOO_MANY_REQUESTS") return t("errors.tooManyRequests");
    const msg = error.message;
    if (msg.includes(".")) return t(msg);
  }
  return t("errors.unknown");
}

export function CheckoutClient() {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const router = useRouter();

  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const setUnit = useCart((s) => s.setUnit);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [addAddressOpen, setAddAddressOpen] = useState(false);

  const { data: meData, isLoading: meLoading } = useQuery(
    trpc.auth.me.queryOptions(),
  );
  const { data: addresses, isLoading: addressesLoading } = useQuery(
    trpc.addresses.list.queryOptions(),
  );
  const { data: feeData } = useQuery(trpc.catalog.deliveryFee.queryOptions());

  const selected =
    selectedAddressId ??
    addresses?.find((a) => a.isDefault)?.id ??
    addresses?.[0]?.id;

  const place = useMutation(
    trpc.orders.place.mutationOptions({
      onSuccess: (data) => {
        clear();
        router.replace(`/orders/${data.orderId}`);
      },
      onError: (err) => {
        toast.error(trpcErrorMessage(err, (k) => String(t(k as never))));
      },
    }),
  );

  if (meLoading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const user = meData?.user;
  const phoneVerified = !!user?.phone;

  return (
    <div
      className={`mx-auto flex max-w-xl flex-col gap-6 px-4 pt-8 ${stickyActionBarSpacerClassName}`}
    >
      <h1 className="text-2xl font-black text-foreground">{t("shop.checkout")}</h1>

      {/* Item summary */}
      <Card>
        <CardContent className="flex flex-col gap-2 pt-6">
          {lines.map((line) => {
            const kind = cartLineUnit(line)?.kind ?? "count";
            // Money lines read "10 EGP worth"; others read "2 × kg".
            const qtyPrefix = isMoneyKind(kind)
              ? String(line.qty)
              : `${formatQty(line.qty, kind)} ×`;
            return (
              <div key={line.itemId} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex-1 text-foreground">
                  {itemDisplayName(line, locale)}
                </span>
                {line.units.length > 1 ? (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>{qtyPrefix}</span>
                    <Select
                      value={line.unitId}
                      onValueChange={(v) => v && setUnit(line.itemId, v)}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1 px-2 py-0 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {line.units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {locale === "ar" ? u.nameAr : u.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {qtyPrefix} {cartLineUnitName(line, locale)}
                  </span>
                )}
              </div>
            );
          })}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
            <span className="font-semibold text-foreground">{t("shop.deliveryFee")}</span>
            <span className="font-bold text-foreground">
              {feeData ? `${feeData.amount} EGP` : "…"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{t("shop.marketPriceNote")}</p>
        </CardContent>
      </Card>

      {/* Delivery address */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">{t("shop.deliverTo")}</h2>
          <Dialog open={addAddressOpen} onOpenChange={setAddAddressOpen}>
            <DialogTrigger
              render={
                <button className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  + {t("address.add")}
                </button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("address.add")}</DialogTitle>
              </DialogHeader>
              <AddressForm
                onSuccess={() => setAddAddressOpen(false)}
                onCancel={() => setAddAddressOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {addressesLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : (addresses ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("address.none")}</p>
        ) : (
          (addresses ?? []).map((address) => (
            <button
              key={address.id}
              onClick={() => setSelectedAddressId(address.id)}
              className={`w-full rounded-xl border p-3 text-start transition-colors ${
                selected === address.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">
                {addressLabel(address, locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {addressSummary(address, locale)}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Order note */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="order-note">{t("shop.orderNote")}</Label>
        <Textarea
          id="order-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>

      {/* Phone gate or place button */}
      {!phoneVerified ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-amber-600">
            {t("shop.verifyPhoneToOrder")}
          </p>
          <PhoneVerifyCard />
        </div>
      ) : (
        <StickyActionBar>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              if (!selected || lines.length === 0) return;
              place.mutate({
                addressId: selected,
                note: note.trim() || undefined,
                items: lines.map((line) => ({
                  itemId: line.itemId,
                  qty: line.qty,
                  unitId: line.unitId,
                  note: line.note,
                })),
              });
            }}
            disabled={place.isPending || !selected || lines.length === 0}
          >
            {place.isPending ? t("shop.placing") : t("shop.placeOrder")}
          </Button>
        </StickyActionBar>
      )}
    </div>
  );
}
