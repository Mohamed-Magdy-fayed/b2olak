# ba2olak — بقولك

Delivery/errand app for Egypt: customers order grocery and market items from
their phone, a ba2olak rider shops for them in real stores and delivers to the
door, cash on delivery.

**Full documentation lives in [docs/](docs/00-product-overview.md)** — product
overview, every user journey, architecture, data model, API contracts, the AI
dedup pipeline, security model, i18n strategy, and the build roadmap.

## Monorepo

| Path | What |
|---|---|
| `apps/web` | Next.js 16 — Gen-Z marketing landing, `/admin` dashboard, and the shared tRPC API + Inngest at `/api/*` |
| `apps/mobile` | Expo (SDK 56) — ONE app, role-based: customer ordering + driver fulfillment. NativeWind styling, AR/EN with RTL |
| `packages/api` | tRPC 11 routers (`base/protected/customer/driver/admin` procedures, rate limits) |
| `packages/db` | Drizzle + Neon Postgres (migrations + seed) |
| `packages/auth` | Redis sessions (web cookie OR mobile bearer), scrypt, WhatsApp OTP |
| `packages/i18n` | Shared EN/AR dictionaries + typed `t()` for web and native |
| `packages/integrations` | Wapilot WhatsApp, Firebase Storage, Upstash Redis, Inngest jobs, Claude (item dedup) |
| `packages/validators` | Zod schemas, Arabic-aware text normalization, order status machine (unit-tested) |
| `packages/ui` / `theme` | shadcn/ui components + shared design tokens |

## Quickstart

```bash
npm install
cp .env.example apps/web/.env        # fill in Neon, Upstash, Wapilot, …
npm run db:migrate && npm run db:seed # tables + admin + 14 categories/117 items
npm run dev                           # web on :3000 AND expo (Metro) on :8081
npx inngest-cli dev                   # (separate terminal) runs AI-dedup + WhatsApp jobs
```

- Admin dashboard: http://localhost:3000/admin — seeded admin from
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
- Mobile: scan the Metro QR with **Expo Go** (latest from the store), or press
  `w` for the browser preview. Physical devices need
  `EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000` in `apps/mobile/.env`.
- Without `WAPILOT_*` env vars, OTP codes print to the web server console.

## Scripts

`npm run dev` · `build` · `typecheck` · `test` (Vitest: normalization + status
machine) · `db:generate` · `db:migrate` · `db:seed` · `db:studio`

## Deploy

- **Web/API → Vercel**: import the repo, set *Root Directory* to `apps/web`
  (Vercel detects Turborepo), add every var from `.env.example` to the project
  env. Point Inngest Cloud at `https://<domain>/api/inngest`.
- **Mobile → EAS**: `cd apps/mobile && eas build --profile production` —
  profiles in `apps/mobile/eas.json` (set `EXPO_PUBLIC_API_URL` to your
  production domain first).
