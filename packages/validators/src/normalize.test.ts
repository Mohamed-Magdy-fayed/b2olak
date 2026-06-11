import { describe, expect, it } from "vitest";

import { detectScript, normalizeText } from "./normalize";

describe("normalizeText", () => {
  it("case-folds and trims latin input", () => {
    expect(normalizeText("  Sugar ")).toBe("sugar");
    expect(normalizeText("SUGAR")).toBe(normalizeText("sugar"));
  });

  it("strips Arabic diacritics and tatweel", () => {
    expect(normalizeText("سُكّر")).toBe("سكر");
    expect(normalizeText("سـكر")).toBe("سكر");
  });

  it("normalizes alef variants to bare alef", () => {
    expect(normalizeText("أرز")).toBe("ارز");
    expect(normalizeText("إرز")).toBe("ارز");
    expect(normalizeText("آرز")).toBe("ارز");
  });

  it("normalizes teh marbuta and alef maksura", () => {
    expect(normalizeText("مكرونة")).toBe("مكرونه");
    expect(normalizeText("حلوى")).toBe("حلوي");
  });

  it("normalizes hamza carriers", () => {
    expect(normalizeText("مؤن")).toBe("مون");
    expect(normalizeText("فئة")).toBe("فيه");
  });

  it("converts Eastern Arabic digits", () => {
    expect(normalizeText("٢٥٠ جرام")).toBe("250 جرام");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(normalizeText("sugar,  white!!")).toBe("sugar white");
  });

  it("makes the dedup poster-case collide", () => {
    expect(normalizeText("Sugar")).toBe(normalizeText("sugar"));
    expect(normalizeText("سُكَّر")).toBe(normalizeText("سكر"));
  });
});

describe("detectScript", () => {
  it("detects Arabic, Latin, and unknown", () => {
    expect(detectScript("سكر")).toBe("ar");
    expect(detectScript("sugar")).toBe("en");
    expect(detectScript("123")).toBe("unknown");
  });
});
