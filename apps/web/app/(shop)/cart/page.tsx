"use client";

import Link from "next/link";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { cartLineUnitName, useCart } from "@/features/shop/cart-store";
import { itemDisplayName } from "@/features/shop/helpers";
import { ItemImage } from "@/features/shop/item-image";
import { QtyStepper } from "@/features/shop/qty-stepper";

import { buttonVariants } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  StickyActionBar,
  stickyActionBarSpacerClassName,
} from "@/components/sticky-action-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export default function CartPage() {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();

  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const setNote = useCart((s) => s.setNote);
  const setUnit = useCart((s) => s.setUnit);
  const remove = useCart((s) => s.remove);

  const { data: feeData } = useQuery(trpc.catalog.deliveryFee.queryOptions());

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-5 px-4 py-24 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
          <ShoppingCart className="size-9 text-primary" aria-hidden />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-bold text-foreground">{t("shop.cartEmpty")}</p>
          <p className="text-sm text-muted-foreground">{t("shop.cartEmptyHint")}</p>
        </div>
        <Link href="/shop" className={buttonVariants({ variant: "default" })}>
          {t("shop.continueShopping")}
        </Link>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-lg px-4 pt-6 ${stickyActionBarSpacerClassName}`}>
      <h1 className="mb-5 font-display text-2xl font-black text-foreground">
        {t("shop.cartTitle")}
      </h1>

      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <Card key={line.itemId} className="overflow-hidden rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="size-14 shrink-0">
                  <ItemImage
                    src={null}
                    alt={itemDisplayName(line, locale)}
                    className="size-14"
                  />
                </div>

                {/* Name + unit + stepper */}
                <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground leading-tight">
                    {itemDisplayName(line, locale)}
                  </span>

                  {line.units.length > 1 ? (
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
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {cartLineUnitName(line, locale)}
                    </span>
                  )}
                </div>

                {/* Qty stepper */}
                <QtyStepper
                  qty={line.qty}
                  onDecrement={() => setQty(line.itemId, line.qty - 1)}
                  onIncrement={() => setQty(line.itemId, line.qty + 1)}
                />
              </div>

              {/* Note input */}
              <input
                className="mt-3 w-full rounded-xl border border-input bg-accent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("shop.itemNote")}
                value={line.note ?? ""}
                onChange={(e) => setNote(line.itemId, e.target.value)}
              />

              {/* Remove */}
              <button
                className="mt-2 flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                onClick={() => remove(line.itemId)}
              >
                <Trash2 className="size-3" aria-hidden />
                {t("shop.remove")}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="mt-5 rounded-2xl">
        <CardContent className="flex flex-col gap-3 pt-5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("shop.itemsAtMarketPrice")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">{t("shop.deliveryFee")}</span>
            <span className="font-bold text-primary">
              {feeData ? `${feeData.amount} EGP` : "…"}
            </span>
          </div>
          <p className="rounded-xl bg-accent px-3 py-2 text-xs text-muted-foreground">
            {t("shop.marketPriceNote")}
          </p>
        </CardContent>
      </Card>

      <StickyActionBar>
        <Link
          href="/checkout"
          className={`w-full ${buttonVariants({ variant: "default", size: "lg" })}`}
        >
          {t("shop.checkout")}
        </Link>
      </StickyActionBar>
    </div>
  );
}
