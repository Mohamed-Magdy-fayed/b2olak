"use client";

import { ItemCard } from "@/features/shop/item-card";
import type { CartUnit } from "@/features/shop/cart-store";

type Item = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  imageUrl?: string | null;
  units: CartUnit[];
  defaultUnit: string | null;
};

type ItemRowScrollerProps = {
  title: string;
  items: Item[];
};

/**
 * Horizontally-scrollable row of item cards.
 * RTL-safe: uses logical Tailwind properties; the browser handles scroll
 * direction automatically when dir="rtl" is set on the html element.
 * Renders nothing when items is empty.
 */
export function ItemRowScroller({ title, items }: ItemRowScrollerProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-black text-foreground">{title}</h2>
      {/* overflow-x-auto with scroll-smooth; hide scrollbar visually */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {items.map((item) => (
          <div key={item.id} role="listitem" className="shrink-0">
            <ItemCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
