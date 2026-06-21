import { expect, test } from "@playwright/test";

import { detectScript, normalizeText } from "@workspace/validators/normalize";

test.describe("normalizeText", () => {
  test("case-folds and trims latin input", () => {
    expect(normalizeText("  Sugar ")).toBe("sugar");
    expect(normalizeText("SUGAR")).toBe(normalizeText("sugar"));
  });

  test("strips Arabic diacritics and tatweel", () => {
    expect(normalizeText("سُكّر")).toBe("سكر");
    expect(normalizeText("سـكر")).toBe("سكر");
  });

  test("normalizes alef variants to bare alef", () => {
    expect(normalizeText("أرز")).toBe("ارز");
    expect(normalizeText("إرز")).toBe("ارز");
    expect(normalizeText("آرز")).toBe("ارز");
  });

  test("normalizes teh marbuta and alef maksura", () => {
    expect(normalizeText("مكرونة")).toBe("مكرونه");
    expect(normalizeText("حلوى")).toBe("حلوي");
  });

  test("normalizes hamza carriers", () => {
    expect(normalizeText("مؤن")).toBe("مون");
    expect(normalizeText("فئة")).toBe("فيه");
  });

  test("converts Eastern Arabic digits", () => {
    expect(normalizeText("٢٥٠ جرام")).toBe("250 جرام");
  });

  test("strips punctuation and collapses whitespace", () => {
    expect(normalizeText("sugar,  white!!")).toBe("sugar white");
  });

  test("makes the dedup poster-case collide", () => {
    expect(normalizeText("Sugar")).toBe(normalizeText("sugar"));
    expect(normalizeText("سُكَّر")).toBe(normalizeText("سكر"));
  });
});

test.describe("detectScript", () => {
  test("detects Arabic, Latin, and unknown", () => {
    expect(detectScript("سكر")).toBe("ar");
    expect(detectScript("sugar")).toBe("en");
    expect(detectScript("123")).toBe("unknown");
  });
});
