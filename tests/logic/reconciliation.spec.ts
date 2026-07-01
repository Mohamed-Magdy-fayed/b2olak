import { expect, test } from "@playwright/test";

import { reconcile } from "@workspace/validators/reconciliation";

test.describe("reconcile — split collected-vs-expected COD", () => {
  test("exact match leaves nothing to reconcile", () => {
    expect(reconcile(100, 100)).toEqual({
      delta: 0,
      walletCredit: 0,
      driverShortfall: 0,
    });
  });

  test("collecting more credits the customer wallet", () => {
    expect(reconcile(120, 100)).toEqual({
      delta: 20,
      walletCredit: 20,
      driverShortfall: 0,
    });
  });

  test("collecting less debits the driver as a positive magnitude", () => {
    expect(reconcile(90, 100)).toEqual({
      delta: -10,
      walletCredit: 0,
      driverShortfall: 10,
    });
  });

  test("rounds binary-float drift to 2 decimals", () => {
    // 100.1 - 100 === 0.09999999999999432 in IEEE-754
    expect(reconcile(100.1, 100).walletCredit).toBe(0.1);
    expect(reconcile(100, 100.1).driverShortfall).toBe(0.1);
  });
});
