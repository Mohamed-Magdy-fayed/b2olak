# Design system

> The golden rule: **use the component system, not raw Tailwind markup.** A styling rule
> is strongest when it lives in a component you must reuse (using `<H1>` *is* the rule),
> then explained here, pointed to from `CLAUDE.md`, and caught by the `ui-auditor` agent.

## Two intentional systems

Web and mobile are **deliberately different** brands — don't try to unify them.

| | Web (`apps/web`, `packages/ui`) | Mobile (`apps/mobile`) |
|---|---|---|
| Vibe | Gen-Z, electric | Dark-luxury, premium |
| Primary / accent | violet `#7c3aed` / lime `#a3e635` | gold `#C9A227` / emerald `#2F6F4E` |
| Surface | light paper, OKLCH vars | charcoal `#0E0E10` canvas |
| Engine | Tailwind 4 + shadcn/ui (base-ui) | NativeWind (Tailwind 3.4) |
| Headings font | system stack | El Messiri (`font-display`) |
| Body font | system stack | Tajawal (default) |

**Where tokens live**
- Shared brand/radius/spacing values: `packages/theme/src/tokens.ts`.
- Web semantic colors: OKLCH CSS variables in `packages/ui/src/styles/globals.css`
  (`--primary`, `--muted`, `--destructive`, …) surfaced to Tailwind via `@theme inline`.
- Mobile colors/fonts: `apps/mobile/tailwind.config.js`.

**Never** hardcode a palette class (`bg-red-500`, `text-blue-600`). Use semantic tokens:
`bg-primary`, `text-muted-foreground`, `border-destructive`, `bg-accent`, etc.

## Typography

Responsive sizing and weight are **baked into the components** — don't re-type a scale.

### Web — `@workspace/ui/components/typography`

`H1`–`H6` (+ `P`, `Lead`, `Large`, `Small`, `Muted`, `Blockquote`, `InlineCode`). Each
heading carries a breakpoint-step responsive scale:

| Tag | Scale | Weight |
|---|---|---|
| `H1` | `text-3xl md:text-4xl lg:text-5xl xl:text-6xl` | `font-extrabold` |
| `H2` | `text-2xl md:text-3xl lg:text-4xl` | `font-bold` (doc-style `border-b`; override with `className="border-0 pb-0"`) |
| `H3` | `text-xl md:text-2xl lg:text-3xl` | `font-semibold` |
| `H4` | `text-lg md:text-xl lg:text-2xl` | `font-semibold` |
| `H5` | `text-base md:text-lg lg:text-xl` | `font-semibold` |
| `H6` | `text-sm md:text-base lg:text-lg` | `font-semibold` |

```tsx
import { H1, Lead } from "@workspace/ui/components/typography";

<H1>{t("landing.hero.title")}</H1>
<Lead>{t("landing.hero.subtitle")}</Lead>
```

**Rule:** never `<h1 className="text-5xl md:text-7xl">`. Use the component; override only
per-instance via `className` (merged last through `cn()`).

### Mobile — `@/components/ui/typography`

One `Typography` component, fixed-semantic variants (NativeWind on phones doesn't scale
by viewport, so there are no breakpoints):

| `variant` | Style |
|---|---|
| `display` | `font-display text-4xl text-foreground` |
| `title` | `font-display text-3xl text-foreground` |
| `heading` | `font-display text-xl text-foreground` |
| `subtitle` | `text-sm text-muted-foreground` |
| `body` (default) | `text-base text-foreground` |
| `caption` | `text-xs text-muted-foreground` |

```tsx
import { Typography } from "@/components/ui/typography";

<Typography variant="title">{t("mobile.welcomeTitle")}</Typography>
<Typography variant="subtitle">{t("mobile.welcomeSubtitle")}</Typography>
```

**Rule:** never `<Text className="font-display text-3xl">` for headings. Use `Typography`.

## Buttons

- **Web** — `@workspace/ui/components/button`: variants `default | outline | secondary |
  ghost | destructive | link`; sizes `xs | sm | default | lg | xl | icon | icon-sm |
  icon-lg`. Built on base-ui + CVA (`buttonVariants`).
- **Mobile** — `@/components/ui/button`: variants `default | secondary | outline | ghost |
  destructive`; sizes `sm | default | lg`. Includes haptics + glow shadow on `default`.

**Rule:** use `Button` — don't restyle a raw `<button>` / `Pressable`. New look needed?
Add a variant to the component, don't fork it inline.

## Menus & overlays

- **Web** uses base-ui primitives: `DropdownMenu`, `Dialog`, `Popover`, `Select`,
  `Tooltip` (in `packages/ui`).
- **Mobile** uses full-screen modals/screens for complex pickers (`account-picker.tsx`,
  `address-form-modal.tsx`) — **not** dropdowns. Match that pattern; reach for a modal or
  a pushed route, not a custom popover.

## Semantic & accessible layout

- **Web:** use semantic landmarks (`header`, `nav`, `main`, `section`, `footer`) and keep
  heading order sequential (don't skip `H2` → `H4`). Interactive elements must be real
  `button`/`a` (or the components above), labelled.
- **Mobile:** set `accessibilityRole` and `accessibilityLabel` on pressables/icons; give
  tap targets `hitSlop`. Icons that imply direction must flip for RTL.
- **RTL:** logical props only (`ms-/me-/ps-/pe-`, `start-/end-`), never
  `ml-/mr-/pl-/pr-`. Default locale is Arabic. Full detail in
  [07-i18n-and-rtl.md](./07-i18n-and-rtl.md).
- **Contrast:** rely on the semantic `*-foreground` pairings (e.g. `bg-primary` +
  `text-primary-foreground`); don't put `text-muted-foreground` on busy/low-contrast
  backgrounds.

## Page visibility — public, unlisted, gated

Web pages fall into three visibility tiers; pick deliberately.

| Tier | How | Use for |
|---|---|---|
| **Public** | normal route, linked in nav/footer, indexable | landing, privacy, terms |
| **Unlisted** | `apps/web/app/(marketing)/(unlisted)/<slug>/page.tsx` | soft-hidden previews, internal one-offs |
| **Gated** | per-page `const session = await getSession(); if (!session) redirect(...)` | anything sensitive |

**Unlisted pages** are reachable by anyone with the URL but undiscoverable:

1. Drop the page in the `(unlisted)` route group — its `layout.tsx` sets
   `robots: { index: false, follow: false }` once, so **noindex is automatic** and can't
   be forgotten. Route-group parens don't change the URL (it's just `/<slug>`).
2. Use an **unguessable slug** (rename the example `internal-preview-7f3a9c2e/`).
3. **Never link it** — not in the footer (`(marketing)/layout.tsx`), nav, or sitemap.
4. Build the page with the design system (Typography components, semantic tokens) like
   any other — see `(unlisted)/internal-preview-7f3a9c2e/page.tsx`.

> ⚠️ This is **security-through-obscurity**, not authentication. Anyone the URL is shared
> with — or who sees it in logs/referrer headers — can open it. For anything truly
> sensitive, use the **Gated** tier (`getSession()` + `redirect`), not an unlisted page.

## Enforcement ladder

1. **Component** — the rule, encoded and reused (strongest).
2. **This doc** — the why and the catalogue.
3. **`CLAUDE.md` hard rule** — the one-line pointer the AI reads every session.
4. **`ui-auditor` subagent** — flags raw headings, ad-hoc text sizing, inline-styled
   buttons, and semantic/a11y gaps. (i18n parity, RTL, and raw-color checks belong to the
   `i18n-rtl-auditor`.)
