import { expect, test } from "@playwright/test";

import {
  clampQty,
  defaultQtyForKind,
  formatQty,
  isMoneyKind,
  minQtyForKind,
  presetsForKind,
  stepForKind,
} from "@workspace/validators/units";

test.describe("presetsForKind", () => {
  test("weight ladder covers ⅛ → 2 kg", () => {
    expect(presetsForKind("weight")).toEqual([0.125, 0.25, 0.5, 0.75, 1, 2]);
  });

  test("money ladder is EGP amounts", () => {
    expect(presetsForKind("money")).toEqual([5, 10, 20, 50]);
  });

  test("count ladder is whole numbers", () => {
    expect(presetsForKind("count")).toEqual([1, 2, 3, 5]);
  });
});

test.describe("step / default / min per kind", () => {
  test("weight steps by ¼, defaults to ½, min ⅛", () => {
    expect(stepForKind("weight")).toBe(0.25);
    expect(defaultQtyForKind("weight")).toBe(0.5);
    expect(minQtyForKind("weight")).toBe(0.125);
  });

  test("money steps by 5, defaults to 10", () => {
    expect(stepForKind("money")).toBe(5);
    expect(defaultQtyForKind("money")).toBe(10);
  });

  test("count steps by 1", () => {
    expect(stepForKind("count")).toBe(1);
    expect(defaultQtyForKind("count")).toBe(1);
  });
});

test.describe("clampQty", () => {
  test("non-positive / NaN falls back to the kind default", () => {
    expect(clampQty(0, "weight")).toBe(0.5);
    expect(clampQty(-3, "money")).toBe(10);
    expect(clampQty(Number.NaN, "count")).toBe(1);
  });

  test("weight keeps 3 decimals, enforces the ⅛ minimum", () => {
    expect(clampQty(0.125, "weight")).toBe(0.125);
    expect(clampQty(0.05, "weight")).toBe(0.125);
    expect(clampQty(0.3759, "weight")).toBe(0.376);
  });

  test("money / count round to whole numbers", () => {
    expect(clampQty(10.4, "money")).toBe(10);
    expect(clampQty(2.6, "count")).toBe(3);
  });

  test("caps at MAX_QTY", () => {
    expect(clampQty(5000, "count")).toBe(1000);
  });
});

test.describe("formatQty", () => {
  test("weight renders fraction glyphs", () => {
    expect(formatQty(0.125, "weight")).toBe("⅛");
    expect(formatQty(0.5, "weight")).toBe("½");
    expect(formatQty(0.75, "weight")).toBe("¾");
    expect(formatQty(1.25, "weight")).toBe("1¼");
    expect(formatQty(2, "weight")).toBe("2");
  });

  test("count / money render plain numbers", () => {
    expect(formatQty(3, "count")).toBe("3");
    expect(formatQty(10, "money")).toBe("10");
  });
});

test.describe("isMoneyKind", () => {
  test("only money is money", () => {
    expect(isMoneyKind("money")).toBe(true);
    expect(isMoneyKind("weight")).toBe(false);
    expect(isMoneyKind("count")).toBe(false);
  });
});
