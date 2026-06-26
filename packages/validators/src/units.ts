/**
 * Shared, pure helpers for units of measure and their quantity behaviour.
 * Safe to import from mobile + web (no server-only deps). The `unitKindValues`
 * tuple is mirrored by the Drizzle enum in `packages/db` — keep them in sync.
 */

export const unitKindValues = ["count", "weight", "money"] as const;
export type UnitKind = (typeof unitKindValues)[number];

/** Largest quantity any single line may carry — mirrors `placeOrderSchema`. */
export const MAX_QTY = 1000;

/** Quick-pick quantities offered for each unit kind (before recently-used). */
export function presetsForKind(kind: UnitKind): number[] {
  switch (kind) {
    case "weight":
      return [0.125, 0.25, 0.5, 0.75, 1, 2];
    case "money":
      return [5, 10, 20, 50];
    case "count":
    default:
      return [1, 2, 3, 5];
  }
}

/** Amount the +/- stepper moves by for each kind. */
export function stepForKind(kind: UnitKind): number {
  switch (kind) {
    case "weight":
      return 0.25;
    case "money":
      return 5;
    case "count":
    default:
      return 1;
  }
}

/** Smallest allowed quantity for each kind. */
export function minQtyForKind(kind: UnitKind): number {
  switch (kind) {
    case "weight":
      return 0.125;
    case "money":
    case "count":
    default:
      return 1;
  }
}

/** Quantity preselected when the picker first opens for a kind. */
export function defaultQtyForKind(kind: UnitKind): number {
  switch (kind) {
    case "weight":
      return 0.5;
    case "money":
      return 10;
    case "count":
    default:
      return 1;
  }
}

export function isMoneyKind(kind: UnitKind): boolean {
  return kind === "money";
}

/**
 * Normalize a user-entered quantity: enforce the kind minimum, round to the
 * kind's granularity (weight → 3 decimals, money/count → whole), and cap at
 * MAX_QTY. Falls back to the kind default for non-positive / NaN input.
 */
export function clampQty(qty: number, kind: UnitKind): number {
  if (!Number.isFinite(qty) || qty <= 0) return defaultQtyForKind(kind);
  const min = minQtyForKind(kind);
  const rounded =
    kind === "weight" ? Math.round(qty * 1000) / 1000 : Math.round(qty);
  return Math.min(MAX_QTY, Math.max(min, rounded));
}

/** Fractional glyphs for the eighths/thirds we surface on weight units. */
const FRACTION_GLYPHS: Record<string, string> = {
  "0.125": "⅛",
  "0.25": "¼",
  "0.333": "⅓",
  "0.375": "⅜",
  "0.5": "½",
  "0.625": "⅝",
  "0.667": "⅔",
  "0.75": "¾",
  "0.875": "⅞",
};

/**
 * Display a quantity for a given kind. Weight renders with fraction glyphs
 * (0.5 → "½", 1.25 → "1¼"); count/money render as plain numbers (the money
 * "X EGP worth" wording is added at the label/i18n layer).
 */
export function formatQty(qty: number, kind: UnitKind): string {
  if (kind !== "weight") {
    return Number.isInteger(qty) ? String(qty) : String(+qty.toFixed(2));
  }
  const whole = Math.floor(qty);
  const frac = +(qty - whole).toFixed(3);
  const glyph = FRACTION_GLYPHS[String(frac)];
  if (glyph) return whole > 0 ? `${whole}${glyph}` : glyph;
  return String(+qty.toFixed(3));
}
