# i18n & RTL (EN + AR)

Arabic is the primary market language; English is fully supported. Every user-visible
string on web AND mobile goes through `t('key')` — no hardcoded copy, ever.

## 1. Shared core — `packages/i18n`

The typed `createI18n()` factory is ported from the reference app
(`src/features/core/i18n/lib.ts`) — pure TypeScript + `Intl` APIs, so it runs in both
Next.js and React Native (Hermes ships Intl):

- Dot-notation keys: `t("orders.status.delivering")`
- Typed params & formatters: `{count:plural}`, `{date:date}`, `{amount:number}`,
  `{status:enum}`, `{items:list}` — all locale-aware (Arabic plural rules included).
- Fallback chain: `ar` → `en`.

Layout:
```
packages/i18n/src/
├── lib.ts             # ported factory (platform-agnostic)
├── dictionaries/
│   ├── en.ts          # ALL strings (web + mobile share one dictionary)
│   └── ar.ts          # every key mirrored — adding a key to en.ts REQUIRES ar.ts
├── react.tsx          # TranslationProvider + useTranslation() (works on web & RN)
└── next.ts            # web-only: NEXT_LOCALE cookie read/write, server getT()
```

**Rule (from global CLAUDE.md): a key added to `en.ts` must be added to `ar.ts` in the
same change.** Typecheck enforces it — dictionaries share one key type.

## 2. Web (Next.js)

- Locale source: `NEXT_LOCALE` cookie (default `ar`). Server components call `getT()`;
  client components use `useTranslation()`.
- `<html lang dir>` set server-side; switching locale updates the cookie and
  `document.dir` without a full reload.
- **RTL-safe CSS everywhere**: logical Tailwind utilities only — `ms-`, `me-`, `ps-`,
  `pe-`, `start-`, `end-`, `text-start` — never `ml-/mr-/pl-/pr-/left-/right-`.
  Directional icons (chevrons, arrows) get `rtl:rotate-180`.
- Marketing pages: Arabic-first copy, `ar` as default locale for SEO/OG metadata with
  `en` alternate.

## 3. Mobile (Expo)

- Locale persisted in device storage (and mirrored to `users.preferredLocale` server-side).
- RTL via `I18nManager.allowRTL(true)` + `forceRTL(isArabic)`.
  **Known platform constraint:** changing RTL direction requires an app reload on
  Android (and a restart on iOS for full effect) — the language switcher shows a
  "restart to apply" prompt (`expo-updates` reload).
- NativeWind styles use the same logical-property discipline; React Native flexbox
  auto-mirrors `flex-start/end` under RTL, and `start/end` spacing utilities are used
  instead of `left/right`.
- Numbers: Western digits (0-9) everywhere for prices/phone numbers (Egyptian app
  convention), Arabic copy around them; `Intl.NumberFormat("ar-EG")` handles
  thousands separators.

## 4. Data-level bilinguality

Catalog entities store both languages as columns (`nameEn`, `nameAr`) — not in
dictionaries. Display rule: show the active locale's name, fall back to the other
when missing (customer-added items may have one language until AI/admin fills the
other). Order line snapshots store both (`nameSnapshotEn/Ar`).

## 5. Translation workflow

1. Developer adds `en.ts` + `ar.ts` keys together (typechecked).
2. Zod validation messages are i18n KEYS, translated client-side — never literal
   English strings in schemas.
3. WhatsApp notification templates live server-side in both languages; the recipient's
   `preferredLocale` picks the variant.
