/**
 * COD delivery reconciliation. Pure math, 2-decimal (EGP), storage-agnostic.
 *
 * At delivery the driver reports the cash they collected. If it differs from the
 * order's expected COD total we split the delta two ways:
 *  - collected MORE than expected → the surplus is credit for the CUSTOMER wallet
 *    (`walletCredit`).
 *  - collected LESS than expected → the shortfall is a debit the DRIVER owes
 *    (`driverShortfall`, a positive magnitude).
 * Exactly one of the two is non-zero (or both zero on an exact match).
 * See packages/api/src/routers/driver.ts (the server caller).
 */

import { round2 } from "./totals";

export interface Reconciliation {
  /** Signed delta: collected − expected, rounded to 2 decimals. */
  delta: number;
  /** Surplus to add to the customer's wallet (≥ 0). */
  walletCredit: number;
  /** Shortfall the driver owes, as a positive magnitude (≥ 0). */
  driverShortfall: number;
}

/** Split the collected-vs-expected difference into a wallet credit or a driver debt. */
export function reconcile(
  amountCollected: number,
  codTotal: number,
): Reconciliation {
  const delta = round2(amountCollected - codTotal);
  return {
    delta,
    walletCredit: delta > 0 ? delta : 0,
    driverShortfall: delta < 0 ? round2(-delta) : 0,
  };
}
