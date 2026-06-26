"use client";

import { useTranslation } from "@workspace/i18n/react";
import { formatQty, stepForKind } from "@workspace/validators/units";

import {
  cartLineUnit,
  useCart,
  type CartLine,
  type CartUnit,
} from "@/features/shop/cart-store";
import { itemDisplayName } from "@/features/shop/helpers";
import { ItemImage } from "@/features/shop/item-image";
import { QuantityUnitPopover } from "@/features/shop/quantity-unit-popover";
import { Button } from "@workspace/ui/components/button";

type CatalogItem = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  imageUrl?: string | null;
  units: CartUnit[];
  defaultUnit: string | null;
};

/** Localized label of an item's default unit (falls back to first). */
function defaultUnitLabel(item: CatalogItem, locale: string): string {
  const u =
    item.units.find((x) => x.code === item.defaultUnit) ?? item.units[0];
  return u ? (locale === "ar" ? u.nameAr : u.nameEn) : "";
}

/**
 * Kind-aware stepper for an item already in the cart: +/- step by the unit's
 * kind, and the quantity itself opens the picker to change unit/amount.
 */
function CartStepper({ item, line }: { item: CatalogItem; line: CartLine }) {
  const setQty = useCart((s) => s.setQty);
  const unit = cartLineUnit(line);
  const kind = unit?.kind ?? "count";
  const step = stepForKind(kind);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-8 rounded-full"
        aria-label="-"
        onClick={() => setQty(item.id, line.qty - step)}
      >
        −
      </Button>
      <QuantityUnitPopover
        item={item}
        editing
        initialUnitId={line.unitId}
        initialQty={line.qty}
        trigger={
          <button
            type="button"
            className="min-w-8 rounded-md px-1 text-center text-sm font-bold tabular-nums hover:bg-muted"
          >
            {formatQty(line.qty, kind)}
          </button>
        }
      />
      <Button
        variant="default"
        size="icon"
        className="size-8 rounded-full"
        aria-label="+"
        onClick={() => setQty(item.id, line.qty + step)}
      >
        +
      </Button>
    </div>
  );
}

export function ItemCard({ item }: { item: CatalogItem }) {
  const { t, locale } = useTranslation();
  const line = useCart((s) => s.lines.find((l) => l.itemId === item.id));

  const displayName = itemDisplayName(item, locale);

  return (
    <div className="flex w-40 shrink-0 flex-col rounded-xl border border-border bg-card p-2 transition-colors hover:bg-muted/50">
      <ItemImage src={item.imageUrl} alt={displayName} className="mb-2" />

      <div className="flex flex-1 flex-col gap-0.5 px-0.5 pb-1">
        <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
          {displayName}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {defaultUnitLabel(item, locale)}
        </span>
      </div>

      <div className="mt-auto px-0.5">
        {line ? (
          <div className="flex justify-center">
            <CartStepper item={item} line={line} />
          </div>
        ) : (
          <QuantityUnitPopover
            item={item}
            trigger={
              <Button size="sm" className="w-full text-xs" disabled={item.units.length === 0}>
                {t("shop.addToCart")}
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

/**
 * Row-list variant — flat horizontal layout, used in the category page and
 * search results where a list density is preferred over cards.
 */
export function ItemCardRow({ item }: { item: CatalogItem }) {
  const { t, locale } = useTranslation();
  const line = useCart((s) => s.lines.find((l) => l.itemId === item.id));

  return (
    <div className="flex items-center justify-between border-b border-border py-3">
      <div className="flex items-center gap-3">
        <ItemImage
          src={item.imageUrl}
          alt={itemDisplayName(item, locale)}
          className="size-10 shrink-0 rounded-md"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {itemDisplayName(item, locale)}
          </span>
          <span className="text-xs text-muted-foreground">
            {defaultUnitLabel(item, locale)}
          </span>
        </div>
      </div>
      {line ? (
        <CartStepper item={item} line={line} />
      ) : (
        <QuantityUnitPopover
          item={item}
          trigger={
            <Button size="sm" disabled={item.units.length === 0}>
              {t("shop.addToCart")}
            </Button>
          }
        />
      )}
    </div>
  );
}
