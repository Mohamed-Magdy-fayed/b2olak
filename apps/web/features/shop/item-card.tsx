"use client";

import { useTranslation } from "@workspace/i18n/react";

import { useCart } from "@/features/shop/cart-store";
import { itemDisplayName } from "@/features/shop/helpers";
import { QtyStepper } from "@/features/shop/qty-stepper";
import { Button } from "@workspace/ui/components/button";

type CatalogItem = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  defaultUnit: "piece" | "kg" | "gram" | "liter" | "pack";
};

export function ItemCard({ item }: { item: CatalogItem }) {
  const { t, locale } = useTranslation();
  const line = useCart((s) => s.lines.find((l) => l.itemId === item.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  return (
    <div className="flex items-center justify-between border-b border-border py-3">
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">
          {itemDisplayName(item, locale)}
        </span>
        <span className="text-xs text-muted-foreground">
          {t(`units.${item.defaultUnit}` as never)}
        </span>
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
