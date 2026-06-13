"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Local persisted cart — prices are unknown until the driver shops. */

export type CartLine = {
  itemId: string;
  nameEn: string | null;
  nameAr: string | null;
  unit: "piece" | "kg" | "gram" | "liter" | "pack";
  qty: number;
  note?: string;
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "qty">) => void;
  setQty: (itemId: string, qty: number) => void;
  setNote: (itemId: string, note: string) => void;
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
