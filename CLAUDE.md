# CLAUDE.md — ba2olak

`ba2olak` (بقولك) is a delivery/errand app for Egypt: customers order grocery/market
items from their phone, a rider shops in real stores and delivers, cash on delivery.
Full detail lives in **[docs/](docs/00-product-overview.md)** — read these before deep work:
[architecture](docs/02-architecture.md) · [data model](docs/03-data-model.md) ·
[API contracts](docs/04-api-contracts.md) · [dedup pipeline](docs/05-item-dedup-pipeline.md) ·
[security](docs/06-security.md) · [i18n & RTL](docs/07-i18n-and-rtl.md) ·
[file structure](docs/08-file-structure.md) · [design system](docs/10-design-system.md) ·
[AI workflow & delegation](docs/11-ai-workflow.md).

> This file is the operating manual. It overrides the global `~/.claude/CLAUDE.md` where
> they conflict. Don't restate the docs here — link them.

## Monorepo map

npm workspaces + Turbo. Two apps, shared packages:

| Path | Role |
|---|---|
| `apps/web` | Next.js 16 — marketing landing, `/admin` dashboard, shared tRPC API + Inngest at `/api/*` |
| `apps/mobile` | Expo SDK 56 — ONE app, role-based: customer ordering + driver fulfillment. NativeWind, AR/EN + RTL |
| `packages/api` | tRPC 11 routers + procedure tiers (`packages/api/src/init.ts`, `root.ts`) |
| `packages/db` | Drizzle + Neon Postgres; schemas in `src/schemas/*`, migrations in `migrations/` |
| `packages/auth` | Redis sessions (web cookie / mobile bearer), scrypt, WhatsApp OTP |
| `packages/i18n` | Shared EN/AR dictionaries + typed `t()` |
| `packages/validators` | Zod schemas, Arabic-aware normalization, order status machine (unit-tested) |
| `packages/integrations` | Wapilot WhatsApp, Firebase Storage, Upstash Redis, Inngest, Claude (dedup) |
| `packages/theme` · `packages/ui` | Shared design tokens · shadcn/ui components |

## Commands

Run from the repo root (Turbo fans out to workspaces). **This shell is Windows / PowerShell.**

```
npm run dev          # web :3000 + expo (Metro) :8081
npm run typecheck    # tsc --noEmit across the monorepo
npm run lint
npm run test         # Vitest: normalization + order status machine
npm run build
npm run db:generate  # drizzle-kit generate (after schema edits)
npm run db:migrate   # apply migrations
npm run db:seed
npm run db:studio
```

Scope to one app for speed: `npm run typecheck --workspace apps/web`.

## Hard rules

1. **Next.js 16 is not the Next you know.** APIs/conventions differ from training data.
   Read the relevant guide in `node_modules/next/dist/docs/` before writing web code.
2. **Schema-first DB.** Edit the Drizzle schema (`packages/db/src/schemas/*`) → `npm run
   db:generate` → `npm run db:migrate`. **Never `db:push`.** Never hand-edit generated
   SQL (exception: *data* migrations — backfills, NOT NULL on populated tables, type
   conversions). Commit the `.sql` + `meta/` snapshot together. → use **`/migrate`**.
3. **Bilingual always.** Every user-visible string is `t('key')` added to **both**
   `packages/i18n/src/dictionaries/en.ts` **and** `ar.ts` in the same change (the shared
   `Dictionary` type fails typecheck otherwise). → use **`/i18n`**.
4. **RTL-safe CSS.** Logical props only (`ms-/me-/ps-/pe-`); never `ml-/mr-/pl-/pr-`.
   Default locale is Arabic (RTL).
5. **No raw color classes** (`bg-red-500`, `text-blue-600`). Use semantic tokens /
   shadcn variables; mobile pulls the same tokens from `packages/theme`.
6. **Keep server-only out of mobile.** `db`, `auth`, `api`, `integrations` are
   server-only — never import them into `apps/mobile`. The mobile bundle gets only
   `EXPO_PUBLIC_API_URL`.
7. **Pick the right tRPC tier** (`packages/api/src/init.ts`): `baseProcedure` (public),
   `protectedProcedure` (auth'd), `customerProcedure` / `driverProcedure` /
   `adminProcedure` (role-guarded). Validate every input with Zod from
   `packages/validators`.
8. **Async → Inngest.** Anything not needed for the immediate response is offloaded to an
   Inngest job. **Claude (Haiku) is called server-side only**, from jobs — never client-side.
9. **Build gate.** `typecheck && build` (plus `test` when touching `packages/validators`)
   must pass after every substantive change. → use **`/gate`**.
10. **Use the design system, not raw markup.** Headings = the Typography components (web
    `@workspace/ui/components/typography` `H1`–`H6`; mobile `@/components/ui/typography`),
    never raw `<h1 className>` or ad-hoc `<Text text-3xl>`. Buttons/menus = the shared
    components (add a variant, don't fork inline). Semantic, accessible, RTL-safe layout.
    → see **[docs/10-design-system.md](docs/10-design-system.md)**, audit with **`ui-auditor`**.

## Token economy & delegation

If you're a high-capability model (Opus/Fable), default to **orchestrator**: keep your own
context lean (plan + interfaces) and push heavy work to subagents. The win is **context
isolation** — a subagent's bulky reads happen in its own window; you only pay for the
distilled result. → full playbook: **[docs/11-ai-workflow.md](docs/11-ai-workflow.md)**.

- **Fan-out reads → `Explore`.** Sweeping many files for an answer? Delegate it; the file
  dumps stay out of your context. This is the biggest saving.
- **Domain tasks → the project subagents** (`i18n-rtl-auditor`, `ui-auditor`,
  `migration-reviewer`, `trpc-builder`).
- **Right-size the model.** Mechanical/specified → Haiku/Sonnet; architecture/judgment →
  Opus/Fable.
- **Don't over-delegate.** Trivial or tightly-coupled work is cheaper done inline — every
  spawn starts cold and re-derives context. Write **self-contained** briefs (the worker
  can't see this conversation): paths, constraints, acceptance criteria, return the
  conclusion only.
- **Verify with `/gate` + tests** so you don't re-read everything to confirm.

## Project commands & agents

- `/feature <desc>` — full-stack vertical slice (validators → tRPC → i18n → mobile/web → gate)
- `/i18n <intent>` — add/edit a key in both dictionaries, or audit for gaps/hardcoded strings
- `/migrate` — the schema-first DB workflow (refuses `db:push`)
- `/gate` — run typecheck + lint + test + build, report concisely
- Subagents: `i18n-rtl-auditor`, `migration-reviewer`, `trpc-builder`, `ui-auditor`

## Where things live

- tRPC root router: `packages/api/src/root.ts` · procedure tiers: `packages/api/src/init.ts`
- DB schema barrel: `packages/db/src/schema.ts` · domain schemas: `packages/db/src/schemas/{auth,catalog,orders,drivers,geo,system,marketing}/`
- Order status machine: `packages/validators/src/order-status.ts`
- Mobile cart store: `apps/mobile/lib/cart-store.ts` · design tokens: `packages/theme/src/tokens.ts`
- Dictionaries: `packages/i18n/src/dictionaries/{en,ar}.ts`
