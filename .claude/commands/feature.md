---
description: Scaffold a full-stack vertical slice across validators, tRPC, i18n, and mobile/web
---

Build a feature end-to-end in the ba2olak idiom. Argument: `$ARGUMENTS` — a description
of the feature.

First restate the feature in one line and confirm which surfaces it touches (mobile
customer, mobile driver, web admin, or a mix). Then work through the layers that apply —
reuse existing patterns; read a neighbouring file in each layer before adding to it.

1. **Validation & types — `packages/validators`**
   Add/extend the Zod schema(s) for the feature's inputs and any shared types. If the
   feature involves order state, reuse/extend the order status machine
   (`src/order-status.ts`) rather than re-implementing transitions. Add a Vitest test if
   you touched normalization or the status machine.

2. **API — `packages/api/src/routers/*` (or `routers/admin/*`)**
   Add the procedure on the **correct tier** (`baseProcedure` / `protectedProcedure` /
   `customerProcedure` / `driverProcedure` / `adminProcedure` — see `src/init.ts`).
   Validate input with the Zod schema from step 1. Wire it into `root.ts` if it's a new
   router. Offload anything non-immediate to an Inngest job; never call Claude/AI
   client-side.

3. **i18n — both dictionaries**
   Add every user-visible string as a `t('key')` in **both**
   `packages/i18n/src/dictionaries/en.ts` and `ar.ts` (follow the `/i18n` rules: same
   path, real Arabic, parity enforced by typecheck).

4. **UI**
   - **Mobile** (`apps/mobile`): Expo Router screen/component, NativeWind styling, RTL-safe
     logical props only, semantic tokens (no raw colors). Use the typed `t()` and the
     tRPC client; persist cart-like local state via the Zustand store pattern
     (`lib/cart-store.ts`). Keep server-only packages out.
   - **Web admin** (`apps/web/app/admin/...`): server component first; add `"use client"`
     only where hooks are needed. Use shadcn/ui (`packages/ui`), TanStack Table for data
     grids, semantic color variables.

5. **Gate**: run `/gate` (typecheck + lint + test + build). Don't call the feature done
   until it's green.

Checklist before finishing — do not skip silently:
- [ ] Zod validation on every new input
- [ ] Correct tRPC procedure tier
- [ ] Strings in **both** en.ts and ar.ts
- [ ] RTL-safe + semantic tokens (no `ml-/mr-`, no `bg-red-500`)
- [ ] No server-only imports in mobile
- [ ] `/gate` passes
