# Design token parity — web vs mobile

## Decision

The two apps use **intentionally different palettes** — they are separate-by-design,
not a shared runtime source of truth. `packages/theme/src/tokens.ts` is a brand
reference, not a consumed runtime file (neither app imports it).

| App | Palette direction | Mode |
|-----|------------------|------|
| Web (`packages/ui/src/styles/globals.css`) | Shadcn/ui OKLCH — violet primary, gray accent | Light-first with dark mode |
| Mobile (`apps/mobile/tailwind.config.js`) | Dark-luxury — charcoal canvas, gold primary, deep-emerald accent | Dark-only |

This divergence is intentional: the web admin/marketing surface targets a neutral,
professional feel; the mobile storefront targets a premium audience.

---

## Parity table

| Semantic role | `packages/theme` (brand ref) | Web CSS var (light) | Mobile Tailwind | Status |
|---|---|---|---|---|
| **primary** | violet `#7c3aed` | `oklch(0.491 0.27 292.581)` ≈ violet | gold `#C9A227` | Intentionally different |
| **primary-foreground** | white `#ffffff` | `oklch(0.969 0.016 293.756)` ≈ white | dark `#0E0E10` | Intentionally different |
| **accent** | lime `#a3e635` | `oklch(0.97 0 0)` = light gray | deep-emerald `#2F6F4E` | Intentionally different (web accent = shadcn hover/interaction role, not brand lime) |
| **background** | ink `#0a0a0f` (dark ref) | `oklch(1 0 0)` = white | charcoal `#0E0E10` | Intentionally different (web is light-first) |
| **foreground** | — | `oklch(0.145 0 0)` ≈ near-black | warm off-white `#F5F2EC` | Intentionally different |
| **card** | — | `oklch(1 0 0)` = white | `#161619` | Intentionally different |
| **muted** | — | `oklch(0.97 0 0)` | `#1C1C20` | Intentionally different |
| **muted-foreground** | — | `oklch(0.556 0 0)` | `#9B968C` | Intentionally different |
| **border** | — | `oklch(0.922 0 0)` | `#2A2A2E` | Intentionally different |
| **destructive** | `#ef4444` | `oklch(0.577 0.245 27.325)` ≈ red-600 | `#F0584F` | Semantically aligned (all red-family) ✓ |
| **success** | `#10b981` (emerald-500) | `oklch(0.696 0.17 162)` ≈ emerald-500 | `#34D399` (emerald-400) | Semantically aligned ✓ |
| **warning** | `#f59e0b` (amber-400) | `oklch(0.769 0.188 79)` ≈ amber-400 | `#E5A33D` (amber-ish) | Semantically aligned ✓ |

---

## What was fixed (step 7)

- **`packages/ui/src/styles/globals.css`** — added `--success`, `--success-foreground`,
  `--warning`, `--warning-foreground` to both `:root` and `.dark`. These were missing
  entirely despite `CLAUDE.md` rules directing Claude to write `bg-warning/10 text-warning`
  etc. on the web; without the CSS var the utility class silently produces nothing.
- **`packages/theme/src/tokens.ts`** — corrected the misleading comment that claimed the
  file was "shared by web and mobile." Neither app imports it at runtime.

---

## Guidance for future work

- **Status/feedback colors** (destructive, success, warning) should stay semantically
  consistent across both apps — use the same color family even if the exact shade differs.
- **Brand colors** (primary, accent, background) are deliberately different and should
  not be unified without a design decision.
- **Web:** use `bg-success/10 text-success`, `bg-warning/10 text-warning`,
  `bg-destructive/10 text-destructive` for tinted banners (the CSS vars now exist).
- **Mobile:** use `bg-success`, `text-warning`, `text-destructive` (NativeWind reads from
  `tailwind.config.js`).
- **`packages/theme/src/tokens.ts`** is the right place to evolve a future shared token
  pipeline — but only promote it to runtime use when both apps are ready to consume it.
