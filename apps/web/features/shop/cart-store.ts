"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Local persisted cart — prices are unknown until the driver shops. */

export type CartUnit = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
};

export type CartLine = {
  itemId: string;
  nameEn: string | null;
  nameAr: string | null;
  /** Units the item can be ordered in (so checkout can offer a choice). */
  units: CartUnit[];
  /** Currently selected unit id — always one of `units`. */
  unitId: string;
  qty: number;
  note?: string;
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "qty">) => void;
  setQty: (itemId: string, qty: number) => void;
  setNote: (itemId: string, note: string) => void;
  setUnit: (itemId: string, unitId: string) => void;
  remove: (itemId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((state) => {
          const existing = state.lines.find((l) => l.itemId === line.itemId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.itemId === line.itemId ? { ...l, qty: l.qty + 1 } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, qty: 1 }] };
        }),
      setQty: (itemId, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.itemId !== itemId)
              : state.lines.map((l) =>
                  l.itemId === itemId ? { ...l, qty } : l,
                ),
        })),
      setNote: (itemId, note) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.itemId === itemId ? { ...l, note } : l,
          ),
        })),
      setUnit: (itemId, unitId) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.itemId === itemId ? { ...l, unitId } : l,
          ),
        })),
      remove: (itemId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.itemId !== itemId),
        })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "ba2olak-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** A catalog item as returned by the public catalog router (units enriched). */
export type CatalogItemForCart = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  units: CartUnit[];
  defaultUnit: string | null;
};

/** Build a cart line (sans qty) from a catalog item, preselecting its default unit. */
export function cartLineFromItem(
  item: CatalogItemForCart,
): Omit<CartLine, "qty"> {
  const def =
    item.units.find((u) => u.code === item.defaultUnit) ?? item.units[0];
  return {
    itemId: item.id,
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    units: item.units,
    unitId: def?.id ?? "",
  };
}

/** Localized name of a cart line's currently-selected unit. */
export function cartLineUnitName(line: CartLine, locale: string): string {
  const u = line.units.find((x) => x.id === line.unitId) ?? line.units[0];
  return u ? (locale === "ar" ? u.nameAr : u.nameEn) : "";
}

/**
 * Hydration-safe total line count — returns 0 until the zustand persist
 * rehydration has completed (avoids SSR/client mismatch in the cart badge).
 */
export function useCartHydrated() {
  const lines = useCart((s) => s.lines);
  // zustand persist fires _hasHydrated synchronously in the browser,
  // but during SSR the store is fresh (lines=[]) so the count will be 0 there
  // too. We explicitly gate on typeof window to be safe.
  if (typeof window === "undefined") return { lines: [], count: 0 };
  return { lines, count: lines.reduce((acc, l) => acc + l.qty, 0) };
}
