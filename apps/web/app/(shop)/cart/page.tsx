"use client";

import Link from "next/link";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { formatQty, isMoneyKind, stepForKind } from "@workspace/validators/units";
import { useTRPC } from "@/lib/trpc/client";
import {
  cartLineUnit,
  cartLineUnitName,
  useCart,
  type CartLine,
} from "@/features/shop/cart-store";
import { itemDisplayName } from "@/features/shop/helpers";
import { ItemImage } from "@/features/shop/item-image";
import { QuantityUnitPopover } from "@/features/shop/quantity-unit-popover";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  StickyActionBar,
  stickyActionBarSpacerClassName,
} from "@/components/sticky-action-bar";

/** One cart line: thumbnail, kind-aware stepper, tap-to-edit unit + quantity. */
function CartLineCard({ line }: { line: CartLine }) {
  const { t, locale } = useTranslation();
  const setQty = useCart((s) => s.setQty);
  const setNote = useCart((s) => s.setNote);
  const remove = useCart((s) => s.remove);

  const unit = cartLineUnit(line);
  const kind = unit?.kind ?? "count";
  const step = stepForKind(kind);

  const item = {
    id: line.itemId,
    nameEn: line.nameEn,
    nameAr: line.nameAr,
    units: line.units,
    defaultUnit: unit?.code ?? null,
  };

  const qtyLabel = isMoneyKind(kind)
    ? t("shop.egpWorth", { amount: line.qty })
    : `${formatQty(line.qty, kind)} ${cartLineUnitName(line, locale)}`;

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="size-14 shrink-0">
            <ItemImage src={null} alt={itemDisplayName(line, locale)} className="size-14" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-sm font-semibold leading-tight text-foreground">
              {itemDisplayName(line, locale)}
            </span>
            <QuantityUnitPopover
              item={item}
              editing
              initialUnitId={line.unitId}
              initialQty={line.qty}
              trigger={
                <button
                  type="button"
                  className="w-fit rounded-md text-xs font-medium text-primary hover:underline"
                >
                  {qtyLabel}
                </button>
              }
            />
          </div>

          {/* Kind-aware stepper */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full"
              aria-label="-"
              onClick={() => setQty(line.itemId, line.qty - step)}
            >
              −
            </Button>
            <span className="min-w-8 text-center text-sm font-bold tabular-nums">
              {formatQty(line.qty, kind)}
            </span>
            <Button
              variant="default"
              size="icon"
              className="size-8 rounded-full"
              aria-label="+"
              onClick={() => setQty(line.itemId, line.qty + step)}
            >
              +
            </Button>
          </div>
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
          className="mt-2 flex items-center gap-1 text-xs text-destructive transition-colors hover:text-destructive/80"
          onClick={() => remove(line.itemId)}
        >
          <Trash2 className="size-3" aria-hidden />
          {t("shop.remove")}
        </button>
      </CardContent>
    </Card>
  );
}

export default function CartPage() {
  const { t } = useTranslation();
  const trpc = useTRPC();

  const lines = useCart((s) => s.lines);
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
          <CartLineCard key={line.itemId} line={line} />
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
