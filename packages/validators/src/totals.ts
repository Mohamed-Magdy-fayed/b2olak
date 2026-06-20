/**
 * COD order money math. Pure, currency-agnostic (amounts are EGP), 2-decimal.
 *
 * The driver enters `actualUnitPrice` per line while shopping; the line total is
 * price × quantity, the items subtotal is the sum of found/substituted lines, and
 * the cash collected on delivery (COD) is items subtotal + delivery fee. Storage
 * columns are `numeric(10,2)`, so every amount is rounded to 2 decimals.
 * See packages/api/src/routers/driver.ts (the server caller).
 */

/** Round to 2 decimals, matching the `numeric(10,2)` columns / `.toFixed(2)`. */
export function round2(amount: number): number {
  return Number(amount.toFixed(2));
}

/** Per-line total a driver records while shopping: unit price × quantity. */
export function lineTotal(unitPrice: number, qty: number): number {
  return round2(unitPrice * qty);
}

/** Items subtotal — the sum of the found/substituted line totals. */
export function itemsTotal(lineTotals: readonly number[]): number {
  return round2(lineTotals.reduce((sum, n) => sum + n, 0));
}

/** Cash collected on delivery: items subtotal + delivery fee. */
export function codTotal(itemsSubtotal: number, deliveryFee: number): number {
  return round2(itemsSubtotal + deliveryFee);
}

/** Format an amount for storage in a `numeric(10,2)` column. */
export function toMoney(amount: number): string {
  return amount.toFixed(2);
}
