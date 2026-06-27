import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  defaultQtyForKind,
  formatQty,
  type UnitKind,
} from "@workspace/validators/units";

/** Local persisted cart (C5) — prices are unknown until the driver shops. */

export type CartUnit = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  kind: UnitKind;
};

export type CartLine = {
  itemId: string;
  nameEn: string | null;
  nameAr: string | null;
  /** Item thumbnail URL, kept so the cart can render the image offline. */
  imageUrl?: string | null;
  /** Units the item can be ordered in (so cart can offer a choice). */
  units: CartUnit[];
  /** Currently selected unit id — always one of `units`. */
  unitId: string;
  qty: number;
  note?: string;
};

/** How many recently-used quantities to remember per unit code. */
const RECENT_QTY_CAP = 4;

type CartState = {
  lines: CartLine[];
  /** Recently chosen quantities, keyed by unit `code` (most-recent-first). */
  recentQty: Record<string, number[]>;
  /** Add (or replace) a line with the unit + quantity chosen in the picker. */
  add: (line: Omit<CartLine, "qty">, qty: number) => void;
  setQty: (itemId: string, qty: number) => void;
  setNote: (itemId: string, note: string) => void;
  setUnit: (itemId: string, unitId: string) => void;
  rememberQty: (unitCode: string, qty: number) => void;
  remove: (itemId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      recentQty: {},
      add: (line, qty) =>
        set((state) => {
          const exists = state.lines.some((l) => l.itemId === line.itemId);
          if (exists) {
            // Re-adding an item from the picker replaces its unit + quantity.
            return {
              lines: state.lines.map((l) =>
                l.itemId === line.itemId ? { ...l, ...line, qty } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, qty }] };
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
      rememberQty: (unitCode, qty) =>
        set((state) => {
          const prev = state.recentQty[unitCode] ?? [];
          const next = [qty, ...prev.filter((q) => q !== qty)].slice(
            0,
            RECENT_QTY_CAP,
          );
          return { recentQty: { ...state.recentQty, [unitCode]: next } };
        }),
      remove: (itemId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.itemId !== itemId),
        })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "ba2olak-cart",
      storage: createJSONStorage(() => AsyncStorage),
      // v1 introduced multi-unit lines; v2 added a `kind` to every unit. Carts
      // persisted before v2 lack it and would mis-render the picker, so drop
      // pre-v2 lines instead of reshaping them.
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) return { lines: [], recentQty: {} } as Partial<CartState>;
        return persisted as Partial<CartState>;
      },
    },
  ),
);

/** A catalog item as returned by the public catalog router (units enriched). */
export type CatalogItemForCart = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  imageUrl?: string | null;
  units: CartUnit[];
  defaultUnit: string | null;
};

/** Resolve an item's default unit object (by code, falling back to the first). */
export function defaultUnitOf(item: CatalogItemForCart): CartUnit | undefined {
  return item.units.find((u) => u.code === item.defaultUnit) ?? item.units[0];
}

/**
 * Build a cart line (sans qty) from a catalog item. Preselects the item's
 * default unit unless `unitId` overrides it (the picker passes the chosen one).
 */
export function cartLineFromItem(
  item: CatalogItemForCart,
  unitId?: string,
): Omit<CartLine, "qty"> {
  const chosen =
    item.units.find((u) => u.id === unitId) ?? defaultUnitOf(item);
  return {
    itemId: item.id,
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    imageUrl: item.imageUrl ?? null,
    units: item.units,
    unitId: chosen?.id ?? "",
  };
}

/** The default quantity to seed the picker with for an item's default unit. */
export function defaultQtyOf(item: CatalogItemForCart): number {
  const u = defaultUnitOf(item);
  return u ? defaultQtyForKind(u.kind) : 1;
}

/** The currently-selected unit object of a cart line. */
export function cartLineUnit(line: CartLine): CartUnit | undefined {
  const units = line.units ?? [];
  return units.find((x) => x.id === line.unitId) ?? units[0];
}

/** Localized name of a cart line's currently-selected unit. */
export function cartLineUnitName(line: CartLine, locale: string): string {
  const u = cartLineUnit(line);
  return u ? (locale === "ar" ? u.nameAr : u.nameEn) : "";
}

/** Fraction-aware quantity text for a cart line (e.g. "½", "2", "10"). */
export function cartLineQtyText(line: CartLine): string {
  const u = cartLineUnit(line);
  return formatQty(line.qty, u?.kind ?? "count");
}
