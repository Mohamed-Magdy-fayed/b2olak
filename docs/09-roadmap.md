# Roadmap — Phased Build Plan

Rules of the road:
1. Every phase ends in a **runnable state** — you can `npm run dev` (web) /
   `npx expo start` (mobile, from P5) and see the progress with your own eyes.
2. Every phase is **its own commit** (or a small, clearly-named series).
3. `npm run typecheck && npm run build` must pass before each phase's commit.

| # | Phase | What lands | What YOU can see/run at the end | Commit message |
|---|---|---|---|---|
| 1 | **Documentation** | This `docs/` folder: journeys, architecture, data model, API contracts, dedup design, security, i18n, file tree, roadmap | Read the docs; approve before code starts | `docs: full product documentation — journeys, architecture, data model, roadmap` |
| 2 | **Monorepo foundation** | `packages/db` (client+helpers), `validators`, `i18n` (ported factory + starter dictionaries), `theme`, `api` (health router), `integrations` (redis); tRPC handler wired in web; `.env.example`; turbo `db:*` tasks | Web boots; `/api/trpc/health.ping` responds; EN/AR switcher flips RTL on a placeholder page | `feat: monorepo packages — db, api, validators, i18n, theme; tRPC handler wired` |
| 3 | **Auth** | `packages/auth` (Redis sessions cookie+bearer, scrypt, OTP); auth schema migration; web sign-in (admin email+password); WhatsApp OTP flow; admin seed; auth rate limits | Sign in as seeded admin on web; request/verify an OTP for a phone (WhatsApp message arrives) | `feat(auth): redis sessions (cookie + bearer), phone signup with whatsapp otp, admin seed` |
| 4 | **Admin + catalog** | `/admin` shell with role guard; categories/items CRUD (bilingual + Firebase images); settings (flat delivery fee); seed: Egyptian grocery categories + ~100 items EN/AR | Log in as admin, browse/edit the seeded bilingual catalog, change the delivery fee | `feat(admin): dashboard shell, categories/items crud, settings, catalog seed` |
| 5 | **Expo bootstrap** | `apps/mobile`: expo-router, NativeWind + react-native-reusables themed from tokens; i18n+RTL; tRPC bearer client + secure-store; phone+OTP screens; role-based shells | Open the app on your phone, sign in with OTP, see customer/driver home in AR/EN with correct RTL | `feat(mobile): expo app — auth, rtl i18n, shadcn-parity theme, role-based shell` |
| 6 | **Customer ordering** | Browse/search (trgm), cart (persisted), address book, checkout (flat fee, COD), place order, orders list + status timeline; Redis catalog cache | Place a real order from your phone; see it in the database/admin | `feat(customer): browse/search, cart, addresses, place COD order, order tracking` |
| 7 | **Missing items + AI dedup** | "Can't find it? Add it"; normalization + trgm matching; Inngest + Claude Haiku job; admin review/merge queue | Add "سكر" then "Sugar" from two accounts → one item; merge queue works in admin | `feat(catalog): customer-added items with ai dedup pipeline and admin merge review` |
| 8 | **Dispatch + driver flow** | Admin orders board + driver mgmt + manual assignment; driver app: assigned orders, shopping checklist with prices, status progression, COD total, delivered | The complete loop: order on phone → assign on web → shop/deliver as driver → customer watches the timeline | `feat(orders): admin dispatch, driver shopping/delivery flow, cod totals, status timeline` |
| 9 | **Notifications + hardening** | Inngest→WhatsApp on all order events (bilingual templates); remaining rate limits; full audit vs [06-security.md](./06-security.md) | WhatsApp pings at each order step; abusive patterns hit 429s | `feat(notifications): whatsapp order updates; security hardening pass` |
| 10 | **Marketing + analytics** | Gen-Z AR-first landing, Meta Pixel + GA4 events, OG/SEO, privacy/terms pages | Public site ready to point campaigns at | `feat(web): marketing landing with pixel/analytics tracking` |
| 11 | **Production readiness** | Vercel deploy + envs, Inngest Cloud, Neon prod, EAS build profiles, index/cache review, empty/loading/error polish, Vitest (normalize, status machine, dedup) | Production URL live; installable EAS build | `chore(release): production deploy config, eas builds, perf and test pass` |

## Acceptance checkpoints

- **P7:** "Sugar" + "سكر" from two accounts resolve to one canonical item.
- **P8:** full happy path ends `delivered` with a complete `order_status_events` trail.
- **P9:** OTP spam, order spam, and item spam are all rate-limited; security checklist
  items each verified.

## Deferred (post-MVP backlog)

Merchant self-service, online payments (Paymob/Fawry), live GPS tracking + push
notifications, auto-dispatch, driver cash settlement ledger, promos/coupons, zone-based
delivery fees, certificate pinning.
