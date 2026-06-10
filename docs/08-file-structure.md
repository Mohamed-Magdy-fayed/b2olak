# Complete File & Folder Structure

The full planned tree for the entire product. Files marked `(existing)` are already in
the repo from the shadcn monorepo template. Everything else is created during the
phases noted in [09-roadmap.md](./09-roadmap.md).

```
ba2olak/
├── docs/                                       # P1 — this documentation
│   ├── 00-product-overview.md
│   ├── 01-journeys/{customer,driver,admin}.md
│   ├── 02-architecture.md
│   ├── 03-data-model.md
│   ├── 04-api-contracts.md
│   ├── 05-item-dedup-pipeline.md
│   ├── 06-security.md
│   ├── 07-i18n-and-rtl.md
│   ├── 08-file-structure.md
│   └── 09-roadmap.md
│
├── apps/
│   ├── web/                                    # Next.js 16 — marketing + admin + API host
│   │   ├── app/
│   │   │   ├── layout.tsx                      # (existing) root: html lang/dir, providers
│   │   │   ├── (marketing)/                    # P10
│   │   │   │   ├── layout.tsx                  # marketing chrome (nav, footer, pixels)
│   │   │   │   ├── page.tsx                    # Gen-Z landing (AR-first)
│   │   │   │   ├── privacy/page.tsx
│   │   │   │   └── terms/page.tsx
│   │   │   ├── (auth)/                         # P3
│   │   │   │   ├── sign-in/page.tsx            # admin email+password (+OAuth/passkey)
│   │   │   │   └── _components/                # auth forms
│   │   │   ├── admin/                          # P4..P8
│   │   │   │   ├── layout.tsx                  # server-side role guard + shell (sidebar)
│   │   │   │   ├── page.tsx                    # dashboard KPIs (A2)
│   │   │   │   ├── orders/page.tsx             # P8 board + dispatch (A6)
│   │   │   │   ├── orders/[orderId]/page.tsx   # detail drawer/page
│   │   │   │   ├── drivers/page.tsx            # P8 (A3)
│   │   │   │   ├── users/page.tsx              # P8 (A8)
│   │   │   │   ├── categories/page.tsx         # P4 (A4)
│   │   │   │   ├── items/page.tsx              # P4 (A4)
│   │   │   │   ├── items/review/page.tsx       # P7 (A5)
│   │   │   │   └── settings/page.tsx           # P4 (A7)
│   │   │   └── api/
│   │   │       ├── trpc/[trpc]/route.ts        # P2 — THE shared API endpoint
│   │   │       ├── inngest/route.ts            # P7
│   │   │       └── oauth/google/route.ts       # P3 (web OAuth callback)
│   │   ├── components/                         # web-only shared UI (admin tables, layout)
│   │   ├── features/                           # web feature components by domain
│   │   │   ├── auth/  ├── admin-orders/  ├── admin-drivers/
│   │   │   ├── admin-catalog/  └── marketing/
│   │   ├── lib/
│   │   │   ├── trpc/{client.tsx,server.ts}     # P2 — query client + RSC helpers
│   │   │   └── analytics.ts                    # P10 — pixel/GA4 events
│   │   ├── env.ts                              # P2 — t3-env (web-side vars)
│   │   ├── next.config.ts (existing)
│   │   └── package.json (existing)
│   │
│   └── mobile/                                 # P5 — Expo, ONE app, role-based
│       ├── app/
│       │   ├── _layout.tsx                     # providers: i18n, query, session
│       │   ├── index.tsx                       # splash → role redirect
│       │   ├── (auth)/
│       │   │   ├── welcome.tsx                 # language pick + carousel (C1)
│       │   │   ├── sign-in.tsx                 # phone entry
│       │   │   └── verify.tsx                  # OTP screen
│       │   ├── (customer)/
│       │   │   ├── _layout.tsx                 # tab bar (home, search, cart, orders, account)
│       │   │   ├── index.tsx                   # home: categories + popular (C3)
│       │   │   ├── category/[id].tsx
│       │   │   ├── search.tsx                  # + "add missing item" sheet (C4) P7
│       │   │   ├── cart.tsx                    # C5
│       │   │   ├── checkout.tsx                # C7
│       │   │   ├── orders/index.tsx            # C8
│       │   │   ├── orders/[id].tsx             # timeline + live lines
│       │   │   ├── addresses/index.tsx         # C6
│       │   │   └── account.tsx                 # C10
│       │   └── (driver)/
│       │       ├── _layout.tsx                 # tab bar (orders, history, account)
│       │       ├── index.tsx                   # availability toggle + active orders (D2/D3)
│       │       ├── orders/[id]/index.tsx       # order detail
│       │       ├── orders/[id]/shopping.tsx    # checklist + prices (D4)
│       │       ├── orders/[id]/delivery.tsx    # D5
│       │       ├── history.tsx                 # D6
│       │       └── account.tsx                 # D7
│       ├── components/ui/                      # react-native-reusables (button, card, input…)
│       ├── components/                         # app components (item-card, status-timeline…)
│       ├── lib/
│       │   ├── trpc.ts                         # client + bearer header link
│       │   ├── session.ts                      # expo-secure-store wrapper
│       │   ├── i18n.tsx                        # RN binding for @workspace/i18n + RTL
│       │   └── cart-store.ts                   # zustand persisted cart
│       ├── assets/                             # icons, splash
│       ├── tailwind.config.ts                  # NativeWind, tokens from @workspace/theme
│       ├── app.json / eas.json / babel.config.js / metro.config.js
│       └── package.json
│
├── packages/
│   ├── db/                                     # P2 skeleton, schemas land with their phases
│   │   ├── src/
│   │   │   ├── client.ts                       # postgres.js + drizzle (Neon pooled, max:1)
│   │   │   ├── helpers.ts                      # id/createdAt/updatedBy/deletedAt (ported)
│   │   │   ├── schema.ts                       # barrel export
│   │   │   └── schemas/
│   │   │       ├── auth/{users,user-credentials,user-tokens,user-oauth-accounts,biometric-credentials}.ts   # P3
│   │   │       ├── drivers/driver-profiles.ts  # P3
│   │   │       ├── catalog/{categories,items,item-aliases,item-merge-suggestions}.ts  # P4/P7
│   │   │       ├── orders/{addresses,orders,order-items,order-status-events}.ts       # P6
│   │   │       └── system/system-settings.ts   # P4
│   │   ├── migrations/                         # drizzle-kit output + 0000_extensions.sql (pg_trgm)
│   │   ├── seed/{index.ts,categories.ts,items.ts,admin.ts}    # P3/P4
│   │   ├── drizzle.config.ts / env.ts / package.json
│   │
│   ├── auth/                                   # P3
│   │   ├── src/
│   │   │   ├── session.ts                      # Redis sessions; getSessionIdFromRequest (cookie|bearer)
│   │   │   ├── password-hasher.ts              # scrypt (ported)
│   │   │   ├── otp.ts                          # OTP create/verify against user_tokens
│   │   │   ├── oauth/{base.ts,google.ts}       # ported PKCE client
│   │   │   └── rbac.ts                         # role assertions shared by api + web layouts
│   │   └── package.json
│   │
│   ├── api/                                    # P2 skeleton, routers land with phases
│   │   ├── src/
│   │   │   ├── init.ts                         # context + base/protected/customer/driver/admin procedures
│   │   │   ├── ratelimit.ts                    # @upstash/ratelimit wrappers
│   │   │   ├── root.ts                         # appRouter + AppRouter type
│   │   │   └── routers/
│   │   │       ├── health.ts                   # P2
│   │   │       ├── auth.ts                     # P3
│   │   │       ├── catalog.ts items.ts         # P4/P7
│   │   │       ├── addresses.ts orders.ts      # P6
│   │   │       ├── driver.ts                   # P8
│   │   │       └── admin/{index,orders,drivers,users,catalog,review,settings}.ts  # P4..P8
│   │   └── package.json
│   │
│   ├── validators/                             # P2
│   │   └── src/{normalize.ts, order-status.ts, auth.ts, catalog.ts, orders.ts, addresses.ts, …}
│   │
│   ├── i18n/                                   # P2 (see 07-i18n-and-rtl.md)
│   │   └── src/{lib.ts, react.tsx, next.ts, dictionaries/{en.ts,ar.ts}}
│   │
│   ├── theme/                                  # P2
│   │   └── src/tokens.ts                       # colors/radii/spacing → web CSS vars + mobile config
│   │
│   ├── integrations/                           # P2 (redis) … P7 (inngest/ai) … P9 (whatsapp jobs)
│   │   └── src/
│   │       ├── redis.ts                        # Upstash client + cache helpers
│   │       ├── firebase/{admin.ts,storage.ts}  # P4 (ported)
│   │       ├── whatsapp/{wapilot.ts,templates.ts}  # P3/P9 (ported + bilingual templates)
│   │       ├── ai/claude.ts                    # P7 — Haiku dedup call
│   │       └── inngest/{client.ts, functions/{item-created.ts, order-events.ts, index.ts}}  # P7/P9
│   │
│   ├── ui/ (existing)                          # shadcn web components — extended, not restructured
│   ├── eslint-config/ (existing)
│   └── typescript-config/ (existing)
│
├── .env.example                                # P2 — all keys documented, no values
├── turbo.json (existing → P2 adds db:* tasks)
├── package.json (existing, npm workspaces)
└── AGENTS.md (existing → updated with project conventions)
```

## Conventions

- New packages mirror `@workspace/ui`'s export-map style (`"./x": "./src/x.ts"`),
  consumed as source (no build step) like the template does.
- Server-only packages (`db`, `auth`, `api`, `integrations`) import `server-only` in
  secret-bearing modules and are never imported by `apps/mobile`.
- Mobile shares: `@workspace/api` (type-only import of `AppRouter`),
  `@workspace/validators`, `@workspace/i18n`, `@workspace/theme`.
