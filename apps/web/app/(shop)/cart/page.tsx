"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { useCart } from "@/features/shop/cart-store";
import { itemDisplayName } from "@/features/shop/helpers";
import { QtyStepper } from "@/features/shop/qty-stepper";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";

export default function CartPage() {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();

  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const setNote = useCart((s) => s.setNote);
  const remove = useCart((s) => s.remove);

  const { data: feeData } = useQuery(trpc.catalog.deliveryFee.queryOptions());

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-4 py-24">
        <p className="text-muted-foreground">{t("shop.cartEmpty")}</p>
        <Link href="/shop" className={buttonVariants({ variant: "default" })}>
          {t("shop.continueShopping")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-black text-foreground">
        {t("shop.cartTitle")}
      </h1>

      <div className="flex flex-col gap-1">
        {lines.map((line) => (
          <div
            key={line.itemId}
            className="flex flex-col gap-2 border-b border-border py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">
                  {itemDisplayName(line, locale)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`units.${line.unit}` as never)}
                </span>
              </div>
              <QtyStepper
                qty={line.qty}
                onDecrement={() => setQty(line.itemId, line.qty - 1)}
                onIncrement={() => setQty(line.itemId, line.qty + 1)}
              />
            </div>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t("shop.itemNote")}
              value={line.note ?? ""}
              onChange={(e) => setNote(line.itemId, e.target.value)}
            />
            <button
              className="self-start text-xs text-destructive hover:underline"
              onClick={() => remove(line.itemId)}
            >
              {t("shop.remove")}
            </button>
          </div>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("shop.itemsAtMarketPrice")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground">{t("shop.deliveryFee")}</span>
            <span className="font-bold text-foreground">
              {feeData ? `${feeData.amount} EGP` : "…"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{t("shop.marketPriceNote")}</p>
          <Link
            href="/checkout"
            className={buttonVariants({ variant: "default", size: "lg" })}
          >
            {t("shop.checkout")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
