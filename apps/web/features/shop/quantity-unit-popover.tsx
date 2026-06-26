"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { useTranslation } from "@workspace/i18n/react";
import {
  clampQty,
  defaultQtyForKind,
  formatQty,
  isMoneyKind,
  presetsForKind,
  stepForKind,
  type UnitKind,
} from "@workspace/validators/units";

import {
  cartLineFromItem,
  defaultUnitOf,
  useCart,
  type CartUnit,
  type CatalogItemForCart,
} from "@/features/shop/cart-store";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

type Props = {
  item: CatalogItemForCart;
  /** Element the popover anchors to (the Add button or the qty stepper). */
  trigger: React.ReactElement;
  initialUnitId?: string;
  initialQty?: number;
  editing?: boolean;
};

function unitName(u: CartUnit | undefined, locale: string): string {
  return u ? (locale === "ar" ? u.nameAr : u.nameEn) : "";
}

/**
 * Quantity + unit picker popover — the single entry point for adding an item to
 * the cart on web. Mirrors the mobile bottom sheet: kind-aware quantity ladder
 * (weight fractions, money amounts, whole counts) plus recently-used amounts.
 */
export function QuantityUnitPopover({
  item,
  trigger,
  initialUnitId,
  initialQty,
  editing,
}: Props) {
  const { t, locale } = useTranslation();
  const add = useCart((s) => s.add);
  const rememberQty = useCart((s) => s.rememberQty);
  const recentQty = useCart((s) => s.recentQty);

  const [open, setOpen] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [qty, setQty] = useState(1);
  const [inputText, setInputText] = useState("");

  const selectedUnit = item.units.find((u) => u.id === unitId);
  const kind: UnitKind = selectedUnit?.kind ?? "count";

  useEffect(() => {
    if (!open) return;
    const start =
      item.units.find((u) => u.id === initialUnitId) ?? defaultUnitOf(item);
    const startQty = initialQty ?? (start ? defaultQtyForKind(start.kind) : 1);
    setUnitId(start?.id ?? "");
    setQty(startQty);
    setInputText(String(startQty));
  }, [open, item, initialUnitId, initialQty]);

  const presets = useMemo(() => {
    if (!selectedUnit) return [] as number[];
    const recent = recentQty[selectedUnit.code] ?? [];
    return [...new Set([...presetsForKind(kind), ...recent])];
  }, [selectedUnit, kind, recentQty]);

  const applyQty = (next: number) => {
    const clamped = clampQty(next, kind);
    setQty(clamped);
    setInputText(String(clamped));
  };

  const onPickUnit = (u: CartUnit) => {
    if (u.id === unitId) return;
    setUnitId(u.id);
    const def = defaultQtyForKind(u.kind);
    setQty(def);
    setInputText(String(def));
  };

  const summary = isMoneyKind(kind)
    ? t("shop.egpWorth", { amount: qty })
    : `${formatQty(qty, kind)} ${unitName(selectedUnit, locale)}`;

  const onConfirm = () => {
    if (!selectedUnit) return;
    add(cartLineFromItem(item, selectedUnit.id), qty);
    rememberQty(selectedUnit.code, qty);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="flex w-72 flex-col gap-3">
        {/* Unit picker */}
        {item.units.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-foreground">{t("shop.pickerUnit")}</span>
            <div className="flex flex-wrap gap-1.5">
              {item.units.map((u) => (
                <Button
                  key={u.id}
                  type="button"
                  size="sm"
                  variant={u.id === unitId ? "default" : "outline"}
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={() => onPickUnit(u)}
                >
                  {unitName(u, locale)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Quantity presets */}
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-foreground">{t("shop.pickerQuantity")}</span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={p === qty ? "default" : "outline"}
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => applyQty(p)}
              >
                {isMoneyKind(kind) ? t("shop.egpWorth", { amount: p }) : formatQty(p, kind)}
              </Button>
            ))}
          </div>
        </div>

        {/* Stepper + custom amount */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            aria-label="-"
            onClick={() => applyQty(qty - stepForKind(kind))}
          >
            <Minus className="size-4" aria-hidden />
          </Button>
          <Input
            inputMode={kind === "weight" ? "decimal" : "numeric"}
            className="h-8 flex-1 text-center text-sm"
            value={inputText}
            placeholder={t("shop.pickerCustom")}
            onChange={(e) => {
              setInputText(e.target.value);
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed) && parsed > 0) setQty(parsed);
            }}
            onBlur={() => applyQty(qty)}
          />
          <Button
            type="button"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            aria-label="+"
            onClick={() => applyQty(qty + stepForKind(kind))}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>

        <Button type="button" className="w-full" disabled={!selectedUnit} onClick={onConfirm}>
          {`${editing ? t("shop.pickerUpdate") : t("shop.addToCart")} · ${summary}`}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
