import { expect, test } from "@playwright/test";

import {
  codTotal,
  itemsTotal,
  lineTotal,
  round2,
  toMoney,
} from "@workspace/validators/totals";

test.describe("lineTotal — unit price × quantity", () => {
  test("multiplies price by a whole quantity", () => {
    expect(lineTotal(12.5, 2)).toBe(25);
  });

  test("cleans up binary-float drift to 2 decimals", () => {
    // 0.1 × 3 === 0.30000000000000004 in IEEE-754
    expect(lineTotal(0.1, 3)).toBe(0.3);
  });

  test("supports fractional quantities (numeric(10,3) qty)", () => {
    expect(lineTotal(20, 1.5)).toBe(30);
    expect(lineTotal(19.99, 0.25)).toBe(5); // 4.9975 → 5.00
  });
});

test.describe("itemsTotal — sum of found/substituted lines", () => {
  test("sums the line totals", () => {
    expect(itemsTotal([25, 30, 5.5])).toBe(60.5);
  });

  test("is zero for an empty cart", () => {
    expect(itemsTotal([])).toBe(0);
  });

  test("rounds the running sum to 2 decimals", () => {
    expect(itemsTotal([0.1, 0.2])).toBe(0.3);
  });
});

test.describe("codTotal — items subtotal + delivery fee", () => {
  test("adds the delivery fee", () => {
    expect(codTotal(60.5, 25)).toBe(85.5);
  });

  test("equals the delivery fee when nothing was found", () => {
    expect(codTotal(0, 25)).toBe(25);
  });

  test("rounds to 2 decimals", () => {
    expect(codTotal(0.1, 0.2)).toBe(0.3);
  });
});

test.describe("money formatting", () => {
  test("round2 returns a 2-decimal number", () => {
    expect(round2(9.999)).toBe(10);
    expect(round2(9.994)).toBe(9.99);
  });

  test("toMoney renders a 2-decimal string for numeric(10,2)", () => {
    expect(toMoney(25)).toBe("25.00");
    expect(toMoney(85.5)).toBe("85.50");
  });
});
