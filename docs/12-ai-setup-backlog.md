# AI setup backlog

A checklist of the things we're hardening so Claude builds ba2olak well. **Do one item
per session** to keep context (and tokens) low.

## How to use this file

1. Open a fresh Claude session.
2. Say: **"Read `docs/12-ai-setup-backlog.md` and do item N."** That's the whole kickoff —
   the new session loads `CLAUDE.md` + the relevant docs automatically and gets the rest
   from the item below. No need to re-explain context.
3. Each item lists a **delegation plan** following
   [docs/11-ai-workflow.md](./11-ai-workflow.md): the manager stays lean and pushes
   read-heavy work to `Explore`/subagents.
4. Check the box when done; note the PR/commit.

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done.

## Already shipped (context for new sessions)

- `[x]` `.claude/` foundation — `CLAUDE.md`, skills (`/feature`,`/i18n`,`/migrate`,`/gate`),
  hooks (block `db:push`, RTL/color lint), subagents.
- `[x]` Design-system codification — Typography (web `H1`–`H6` + mobile `Typography`),
  buttons/menus rules, `docs/10-design-system.md`, `ui-auditor`.
- `[x]` Unlisted public pages — `(unlisted)` route group + noindex.
- `[x]` Token-economy / delegation protocol — `docs/11-ai-workflow.md`.

## Recommended order

Verification first (it makes everything else safe to automate), then backend correctness
& safety, then frontend, then launch:

**1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9** (but any item can be done standalone).

---

## A. Verification & backend

> **Testing tool decision: standardize on Playwright Test (`@playwright/test`) as the
> single runner.** It's a general test runner — it runs pure-function tests headlessly
> (no browser) *and* drives real browsers for E2E, so one tool covers both layers (items
> 1 and 4). Trade-offs accepted: no built-in module mocker (use Node-ecosystem libs when a
> test needs stubbing) and a slower watch loop than Vitest. The repo currently uses Vitest
> in `packages/validators`; item 1 includes migrating/retiring it.

### `[x]` 1. Domain test suite (Playwright Test, headless / no browser)
- **Goal:** real test coverage of pure business logic so `/gate` actually proves correctness.
- **Why:** unblocks safe delegation and autonomous runs — the manager can trust a green
  gate instead of re-reading code.
- **Scope:** logic tests for item dedup normalization + similarity threshold (see
  [docs/05](./05-item-dedup-pipeline.md)), cart + delivery-fee + COD totals, and
  order-status transitions (`packages/validators/src/order-status.ts`). Stand up
  `@playwright/test` as the runner with a **non-browser project** for these (plain
  import-and-assert, no `page`). Migrate the existing Vitest tests
  (`packages/validators`) over, then retire Vitest + update the `npm run test` / `/gate`
  references.
- **Delegation:** `Explore` to list pure functions lacking tests + find current Vitest
  tests → write/port tests inline → run the suite.
- **Decisions at kickoff:** migrate existing Vitest tests now or keep them until item 4;
  which modules are in scope for round one; coverage target; mocking approach if any test
  needs it.
- **Done when:** logic tests pass via the Playwright runner; `npm run test` / `/gate`
  point at it; Vitest removed (or a dated note on why it's staying).
- **Status (2026-06-20) — round one done; Vitest kept until item 4 (decided at kickoff):**
  - Stood up `@playwright/test` at the repo root: `playwright.config.ts` with a non-browser
    `logic` project (`tests/logic/`), `npm run test:logic` script. 16 tests, all green.
  - Extracted the previously-inline pure logic into `packages/validators` and pointed the
    server callers at it (behavior-preserving):
    - `src/totals.ts` — COD money math (`lineTotal`, `itemsTotal`, `codTotal`, `round2`,
      `toMoney`); now used by `packages/api/src/routers/driver.ts`.
    - `src/dedup.ts` — `decideItemMerge` + `AUTO_MERGE_MIN_SIMILARITY` (the trgm/AI
      auto-merge gate); now used by `packages/integrations/.../item-created.ts`.
  - The existing Vitest specs (`normalize.test.ts`, `order-status.test.ts`) stay on Vitest
    and still pass; `npm run test` / `/gate` are unchanged this round.
  - **Deferred to item 4 (consolidation):** port those two specs into the Playwright `logic`
    project, remove Vitest from `packages/validators`, and repoint `npm run test` + the
    `/gate` skill at the Playwright runner. Until then the repo runs two runners by design.

### `[x]` 2. tRPC best-practices pass
- **Goal:** confirm every procedure uses the right tier, validates input with Zod, and
  follows the repo idiom; fix the stragglers.
- **Why:** the API is the contract for web + mobile; inconsistencies here leak everywhere.
- **Scope:** audit `packages/api/src/routers/**` against `init.ts` tiers
  (`base/protected/customer/driver/admin`), Zod-on-every-input, error handling
  (`TRPCError` codes), no server-only leakage, Inngest for async. See
  [docs/04](./04-api-contracts.md).
- **Delegation:** `Explore` to inventory procedures + flag issues → fix with the
  `trpc-builder` subagent → `/gate`.
- **Decisions at kickoff:** fix-as-you-find vs. report-then-batch.
- **Done when:** audit report + fixes merged; `/gate` green.
- **Status (2026-06-20) — done; report-then-batch (decided at kickoff):** audited all 19
  router files + `init.ts`/`root.ts`. **Tiers, authZ, error codes, and Inngest-for-async
  were all already correct** — incl. the exemplary multi-role `orders.byId` and the
  timing-safe `auth.deviceLogin`. Fixes applied:
  - **Idiom (hard rule #7):** moved the db-enum-free domain input schemas out of routers
    into `packages/validators` — `driver.ts` (`updateLineSchema`, `markDeliveredSchema`),
    `analytics.ts` (`trackEventSchema`), `geo.ts` (geo name/import/bulk), and added
    `storeLinksUpdateSchema` + `importItem/CategoryRowSchema` to `catalog.ts`. **Kept
    `admin/drivers` + `admin/users` schemas inline by design** — they reference db enum
    arrays (`vehicleTypeValues`, etc.) and moving them would couple validators→db,
    breaking hard rule #6 (validators is client-shared). Trivial `{ id }` inputs stay inline.
  - **Correctness:** `auth.registerPushToken` token now `.min(1)` (was clobberable by an
    empty string); dropped a redundant `ne(status,'merged')` predicate (the
    `eq(status,'approved')` already covers it) in `catalog.popularItems`/`reorderItems`;
    `catalog.reorderItems` tightened `protected → customer` (it's customer-scoped data).
  - **Decision:** `orders.byId` returning the driver's phone to the customer was a stale
    comment, not a leak — comment corrected (customers keep the driver contact during an
    active delivery).
  - `/gate` green: typecheck (12 pkgs) · test 15/15 · lint 0 errors · build.

### `[x]` 3. Backend security hardening
- **Goal:** make the backend resilient to abuse and common attacks.
- **Why:** COD + phone-OTP + admin surface = real attack surface; one hole is expensive.
- **Scope:** review against [docs/06-security.md](./06-security.md): authZ on every
  procedure (no missing role guards), rate limiting on OTP/order/auth, input validation &
  injection safety (Drizzle parameterization), session handling, secrets never in the
  mobile bundle, IDOR checks (can a customer read another's order?), webhook/signature
  verification (Inngest, Wapilot). Consider the `/security-review` skill.
- **Delegation:** `Explore` for the surface map → run `/security-review` →
  triage + fix high/critical inline → `/gate`.
- **Decisions at kickoff:** severity bar for "fix now" vs. backlog.
- **Done when:** findings triaged; high/critical fixed; rest logged.
- **Status (2026-06-20) — done; severity bar = fix high/critical inline, log
  medium/low (decided at kickoff). No high/critical found; no code changed.**
  Mapped the full surface (`Explore`) and verified the load-bearing controls by hand:
  - **AuthZ / tiers:** clean (item 2 already fixed the stragglers). `orders.byId` does an
    explicit admin/customer/driver ownership check; all order/address/driver reads &
    mutations filter by `customerId`/`driverId`/`userId` or are `adminProcedure`. **No
    IDOR found.**
  - **Money integrity (COD):** `orders.place` trusts **no** client prices — lines carry
    only `qty`/`unit`/`note`; delivery fee is server-fetched; chosen units are validated
    against the item's allowed `item_units` (rejects `orders.unitNotAllowed`). Shelf
    prices are filled by the driver later. Solid.
  - **Rate limits:** all spec'd limits wired (OTP send phone+ip, verifyOtp, deviceLogin,
    items.create, orders.place, search, analytics, waitlist). Sliding-window via Upstash;
    prod always enforces (dev-only skip when Upstash env absent).
  - **IP spoofing (investigated, NOT a bug):** `ipFromHeaders` takes the leftmost
    `x-forwarded-for`. Per Vercel docs, Vercel **overwrites** `x-forwarded-for` and does
    not forward external IPs (non-Enterprise), so the value is the real client IP and is
    not spoofable on this deployment. No change.
  - **Injection:** Drizzle parameterized throughout; pg_trgm similarity binds the
    normalized string + column refs; no raw string interpolation.
  - **Session/OTP:** 512-bit session ids; httpOnly+Secure(prod)+SameSite=Lax cookies;
    scrypt+salt passwords; OTP 6-digit/10-min/5-attempt with timing-safe compare and
    single-active-token; sessions revoked on sign-out / role-change / suspension;
    `requestOtp` returns identical `{ ok: true }` for new/existing/suspended phones
    (no enumeration). All good.
  - **Webhooks:** Inngest `serve()` configured with `INNGEST_SIGNING_KEY`; fails closed
    (refuses unsigned) outside dev. No inbound WhatsApp webhook exists yet.
  - **Logged follow-ups (medium/low, no active hole):**
    - **[M] Enforce `server-only` at build** — `db`/`auth`/`api`/`integrations` are
      server-only by convention + architecture (hard rule #6) but not enforced by the
      `server-only` package. Add `import "server-only"` to their server entrypoints as
      defense-in-depth; verify the tRPC `AppRouter` **type-only** client import stays
      clean and both apps still build (own focused change — build-break risk).
    - **[L] `INNGEST_SIGNING_KEY` is prod-required** — `signingKey: env || undefined`
      disables verification if unset; Inngest fails closed in prod, but make the key a
      required/asserted prod env so it can't silently go missing.
    - **[L/future] WhatsApp inbound webhook** — none today; when Wapilot delivery/read
      callbacks are consumed, require signature verification (see threat model row).
    - **[info] OTP token hashed with SHA-256** — acceptable (high-entropy, 10-min expiry,
      5-attempt cap, rate-limited); no change.

### `[x]` 4. Playwright E2E + browser checks
- **Goal:** end-to-end browser tests for the critical web flows + browser-level validation
  the AI can run itself.
- **Why:** catches integration/UX regressions logic tests can't; Playwright lets Claude
  assert on real rendered pages.
- **Scope:** add a **browser project** to the Playwright setup from item 1 (same runner,
  second project) in `apps/web`; cover admin sign-in, an admin data-table flow (after
  item 6), and the marketing/legal pages. Add a `test:e2e` script; wire into the gate/CI
  when ready. Pure-logic tests stay in the non-browser project (item 1) — same tool, two
  projects. **Carried over from item 1:** port the two remaining Vitest specs
  (`packages/validators/src/{normalize,order-status}.test.ts`) into the `logic` project,
  remove Vitest from `packages/validators`, and repoint `npm run test` + `/gate` at
  Playwright (the repo runs two runners until this lands).
- **Delegation:** `Plan` for the harness design → implement inline → run headless.
- **Decisions at kickoff:** which 3–5 flows first; test DB / seed strategy; CI now or later.
- **Done when:** the browser project runs green locally on the chosen flows.
- **Status (2026-06-21) — done:**
  - Ported `normalize.test.ts` + `order-status.test.ts` into `tests/logic/` (Playwright
    `test()` API); deleted the Vitest originals; removed Vitest from
    `packages/validators/package.json`.
  - Added `web` browser project to `playwright.config.ts` with `webServer` (starts
    `npm run dev --workspace web`, `reuseExistingServer` in dev). `BASE_URL` env overrides.
  - E2E tests in `tests/e2e/marketing.spec.ts`: privacy page content, terms page heading,
    `/admin` → sign-in redirect, sign-in form renders.
  - `npm run test` now points at Playwright `--project=logic` (31 tests, all green).
    `npm run test:e2e` runs the browser project. `/gate` skill updated accordingly.
  - **CI:** deferred to parking lot — wire when GitHub Actions is set up.
  - **Admin data-table flow:** deferred to item 6 (no table component yet).

## B. Frontend & design

### `[x]` 5. shadcn/ui usage guide
- **Goal:** teach Claude exactly how we use shadcn/ui so it composes from our components
  instead of hand-rolling markup.
- **Why:** consistency + speed; complements the design system already in
  [docs/10](./10-design-system.md).
- **Scope:** extend `docs/10` (or a focused `docs/13-shadcn.md`) with the `packages/ui`
  component catalog, when to use which, how we extend via CVA (Button/Badge as the model),
  the `cn()` pattern, and "add a variant, don't fork inline." Optionally a `/ui` skill.
- **Delegation:** `Explore` to inventory `packages/ui/src/components/**` → write the guide.
- **Decisions at kickoff:** new doc vs. expand docs/10; build a `/ui` skill or not.
- **Done when:** the guide lists every component + usage rule; linked from CLAUDE.md.
- **Status (2026-06-21) — done; new doc + no /ui skill (decided at kickoff):**
  Created `docs/13-shadcn.md` covering all 22 components: import paths, when-to-use,
  CVA extension model, `cn()` pattern, color token table, missing-component list, RTL
  checklist. Linked from CLAUDE.md header (docs index) and from the design-system rule
  (hard rule #10). No `/ui` skill — the guide itself is the deliverable.

### `[x]` 6. Admin data-table pattern (rich tables)
- **Goal:** codify ONE reusable admin DataTable so every transactional table gets the same
  rich behavior: sorting, column ordering/visibility, server-side pagination, filters.
- **Why:** your tables are specific and feature-heavy; without a canonical pattern each
  screen drifts.
- **Scope:** a shared `DataTable` (TanStack Table + shadcn) wired to a **standard tRPC
  list contract** (`{ page, pageSize, sort, filters }` → `{ rows, total }`) with
  server-side paging/sort/filter. Pick one existing admin table (orders/users/catalog) as
  the reference implementation. Document the contract so new tables are copy-paste.
- **Delegation:** `Explore` current admin tables + any existing pagination → `Plan` the
  DataTable API + tRPC list contract → implement (UI inline, API via `trpc-builder`) →
  `/gate` + a Playwright check (ties to item 4).
- **Decisions at kickoff:** URL-state vs. local-state for table params; which table is the
  reference; filter types needed (text, enum, date range).
- **Done when:** reference table uses the shared component end-to-end; contract documented.
- **Status (2026-06-21) — done; all infrastructure already existed; this session documented it:**
  - The full `DataTable` suite was already built at `apps/web/features/core/data-table/`
    (TanStack Table v8, `useDataTable`, `useTableUrlState`, all filter components).
  - All 6 admin routers already use `tableListInputSchema` + `pageMath` from
    `packages/api/src/lib/table-query.ts` — the wire contract was already standardized.
  - **Decisions (at kickoff):** URL-state (confirmed, via `useTableUrlState`); reference =
    **orders table** (most complete: every filter type + bulk actions + export); filter
    types = text, faceted enum, date range, numeric range.
  - Created **`docs/13-admin-data-table.md`** — wire contract reference, component API,
    5-step copy-paste guide for new tables, decision log. Linked from CLAUDE.md.

### `[x]` 7. Web ↔ mobile color/token parity
- **Goal:** verify the two themes are intentionally aligned (not accidentally divergent)
  and there's a single source of truth where they should match.
- **Why:** you haven't strongly verified parity; drift makes the brand feel inconsistent.
- **Scope:** reconcile `packages/theme/src/tokens.ts`, web OKLCH vars in
  `packages/ui/src/styles/globals.css`, and `apps/mobile/tailwind.config.js`. Confirm
  semantic roles (primary/destructive/success/warning/muted) map sensibly across the two
  intentionally-different palettes; document which tokens are shared vs. deliberately
  different (per [docs/10](./10-design-system.md)).
- **Delegation:** `Explore`/`i18n-rtl-auditor`-style read of the three token sources →
  produce a parity table → fix mismatches.
- **Decisions at kickoff:** make `packages/theme` the single source mobile consumes, or
  keep them separate-by-design and just document.
- **Done when:** a parity table exists; any accidental mismatches fixed.
- **Status (2026-06-21) — done; separate-by-design (decided at kickoff):** audited all
  three token sources. No runtime file imports `packages/theme/src/tokens.ts` — the
  comment claiming it was a shared SoT was corrected. Two palettes are intentionally
  different (web: light/violet/shadcn; mobile: dark-luxury/gold/emerald). One accidental
  gap fixed: `--success` and `--warning` CSS vars were missing from web `globals.css`
  despite `CLAUDE.md` rules referencing them — added to both `:root` and `.dark`.
  Parity table → `docs/13-token-parity.md`.

### `[ ]` 8. UX quality pass
- **Goal:** make the app *feel* good — the thing that brings users back.
- **Why:** retention is the product goal; polish is a feature.
- **Scope:** audit loading/empty/error/success states, optimistic updates, haptics
  (mobile), motion/transitions, tap-target sizes, perceived performance, and the RTL
  experience. Produce a prioritized punch-list, then fix the top items.
- **Delegation:** `ui-auditor` + `Explore` for the inventory → prioritized list → fix top
  N inline → verify with Playwright/preview screenshots.
- **Decisions at kickoff:** customer app vs. driver app vs. admin first; how many to fix
  this round.
- **Done when:** punch-list exists; top-priority items fixed and verified.

## C. Launch & compliance

### `[ ]` 9. Store submission readiness (Google Play + App Store)
- **Goal:** make sure Claude knows — and the repo satisfies — what's required to ship to
  the stores.
- **Why:** missing a Data Safety form or account-deletion flow blocks release late.
- **Scope:** checklist + gaps for: privacy policy + terms (exist at `/privacy`, `/terms`),
  **in-app account deletion** (Play requirement; privacy page references it — verify it's
  real), Google Play **Data Safety** form content, permissions justification (notifications,
  etc.), content rating, target SDK/Expo build config (`apps/mobile/eas.json`, `app.json`),
  App Store equivalents (App Privacy, ATT if any tracking). Capture as
  `docs/14-store-readiness.md`.
- **Delegation:** `WebSearch` for current store requirements → `Explore` what the app
  already has → gap checklist.
- **Decisions at kickoff:** Play first or both; who owns store-console steps (manual, not
  Claude).
- **Done when:** readiness doc with a green/red checklist; code gaps logged as follow-ups.

---

## Parking lot (raw ideas — promote to numbered items when ready)

- CI: GitHub Actions running `/gate` + tests on every PR (pairs with items 1 & 4).
- Accessibility audit (WCAG) as a dedicated pass beyond item 8.
- Performance budget (web Core Web Vitals; mobile bundle size).
- Observability: error tracking / logging strategy.
- _Add yours here as they come — keep them out of session context until promoted._
