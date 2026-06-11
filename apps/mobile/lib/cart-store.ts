import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Local persisted cart (C5) — prices are unknown until the driver shops. */

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
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
