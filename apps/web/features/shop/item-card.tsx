"use client";

import { useTranslation } from "@workspace/i18n/react";

import { useCart } from "@/features/shop/cart-store";
import { itemDisplayName } from "@/features/shop/helpers";
import { ItemImage } from "@/features/shop/item-image";
import { QtyStepper } from "@/features/shop/qty-stepper";
import { Button } from "@workspace/ui/components/button";

type CatalogItem = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  imageUrl?: string | null;
  defaultUnit: "piece" | "kg" | "gram" | "liter" | "pack";
};

export function ItemCard({ item }: { item: CatalogItem }) {
  const { t, locale } = useTranslation();
  const line = useCart((s) => s.lines.find((l) => l.itemId === item.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  const displayName = itemDisplayName(item, locale);

  return (
    <div className="flex w-40 shrink-0 flex-col rounded-xl border border-border bg-card p-2 transition-colors hover:bg-muted/50">
      <ItemImage src={item.imageUrl} alt={displayName} className="mb-2" />

      <div className="flex flex-1 flex-col gap-0.5 px-0.5 pb-1">
        <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
          {displayName}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {t(`units.${item.defaultUnit}` as never)}
        </span>
      </div>

      <div className="mt-auto px-0.5">
        {line ? (
          <div className="flex justify-center">
            <QtyStepper
              qty={line.qty}
              onDecrement={() => setQty(item.id, line.qty - 1)}
              onIncrement={() => setQty(item.id, line.qty + 1)}
            />
          </div>
        ) : (
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={() =>
              add({
                itemId: item.id,
                nameEn: item.nameEn,
                nameAr: item.nameAr,
                unit: item.defaultUnit,
              })
            }
          >
            {t("shop.addToCart")}
          </Button>
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
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

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
            {t(`units.${item.defaultUnit}` as never)}
          </span>
        </div>
      </div>
      {line ? (
        <QtyStepper
          qty={line.qty}
          onDecrement={() => setQty(item.id, line.qty - 1)}
          onIncrement={() => setQty(item.id, line.qty + 1)}
        />
      ) : (
        <Button
          size="sm"
          onClick={() =>
            add({
              itemId: item.id,
              nameEn: item.nameEn,
              nameAr: item.nameAr,
              unit: item.defaultUnit,
            })
          }
        >
          {t("shop.addToCart")}
        </Button>
      )}
    </div>
  );
}
