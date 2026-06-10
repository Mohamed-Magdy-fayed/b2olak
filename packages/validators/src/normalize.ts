/**
 * Text normalization for the crowd-sourced catalog.
 * "Sugar", "sugar", " sugar " and "سُكّر" must all normalize to comparable forms
 * before exact/fuzzy matching. See docs/05-item-dedup-pipeline.md.
 */

const ARABIC_DIACRITICS = /[ً-ْٰ]/g; // tashkeel + superscript alef
const TATWEEL = /ـ/g;
const ALEF_VARIANTS = /[آأإٱ]/g; // آ أ إ ٱ → ا
const TEH_MARBUTA = /ة/g; // ة → ه
const ALEF_MAKSURA = /ى/g; // ى → ي
const WAW_HAMZA = /ؤ/g; // ؤ → و
const YEH_HAMZA = /ئ/g; // ئ → ي
const EASTERN_DIGITS = /[٠-٩]/g; // ٠-٩ → 0-9
const PUNCTUATION = /[^\p{L}\p{N}\s]/gu;
const WHITESPACE = /\s+/g;
const ARABIC_LETTERS = /[؀-ۿ]/;

export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(ALEF_VARIANTS, "ا")
    .replace(TEH_MARBUTA, "ه")
    .replace(ALEF_MAKSURA, "ي")
    .replace(WAW_HAMZA, "و")
    .replace(YEH_HAMZA, "ي")
    .replace(EASTERN_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PUNCTUATION, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

export type Script = "ar" | "en" | "unknown";

export function detectScript(input: string): Script {
  if (ARABIC_LETTERS.test(input)) return "ar";
  if (/[a-z]/i.test(input)) return "en";
  return "unknown";
}
