# Architecture

## 1. System diagram

```
                ┌─────────────────────────── Vercel ───────────────────────────┐
                │  apps/web (Next.js 16)                                       │
┌──────────┐   │  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐  │
│ Visitor  │──▶│  │ (marketing)  │  │ /admin        │  │ /api/trpc/[trpc]   │  │
│ browser  │   │  │ landing page │  │ dashboard     │  │ shared tRPC API    │  │
└──────────┘   │  └──────────────┘  └───────┬───────┘  └─────────┬──────────┘  │
               │                            │ (same-origin)      │             │
               │  ┌──────────────┐          ▼                    │             │
               │  │ /api/inngest │◀── packages/api (routers) ────┤             │
               │  └──────┬───────┘    packages/auth (sessions)   │             │
               └─────────┼────────────packages/db (drizzle)──────┼─────────────┘
                         │                   │                   │ HTTPS + Bearer
        ┌────────────────┼───────────┐       │             ┌─────┴─────────┐
        ▼                ▼           ▼       ▼             │ apps/mobile   │
   ┌─────────┐    ┌───────────┐ ┌─────────┐ ┌──────┐       │ (Expo, one    │
   │ Inngest │    │ Claude    │ │ Wapilot │ │ Neon │       │ app: customer │
   │ Cloud   │    │ Haiku     │ │WhatsApp │ │ PG   │       │ + driver UIs) │
   └─────────┘    │(dedup AI) │ └─────────┘ └──────┘       └───────────────┘
                  └───────────┘   ┌─────────────┐ ┌──────────────────┐
                                  │ Upstash     │ │ Firebase Storage │
                                  │ Redis       │ │ (images)         │
                                  └─────────────┘ └──────────────────┘
```

## 2. Key decisions

| Area | Decision | Why |
|---|---|---|
| API | tRPC 11 routers in `packages/api`; HTTP handler at `apps/web/app/api/trpc/[trpc]/route.ts` | One backend for web + mobile (create-t3-turbo pattern). Vercel-only hosting. Native apps don't enforce CORS, so mobile just calls `https://<domain>/api/trpc`. |
| Sessions | Upstash Redis, 7-day TTL, random 512-bit ids. Web: httpOnly `session-id` cookie. Mobile: same session id sent as `Authorization: Bearer`, stored in `expo-secure-store`. | One session system, two transports. Ported from the reference app; the seam is `getUserSessionById`. |
| Auth identity | Customers/drivers: phone + WhatsApp OTP (no passwords). Admins: email + password (+ Google OAuth, passkeys). | Phone-first market; WhatsApp OTP reuses the existing Wapilot integration. |
| DB | Neon Postgres (pooled connection string) + Drizzle (postgres.js, `max: 1` per serverless instance) | Serverless-safe; matches reference app. `pg_trgm` extension for fuzzy item matching. |
| Background jobs | Inngest (`/api/inngest`): item dedup AI, WhatsApp notifications, delayed reminders | Anything not needed for the immediate response is offloaded. Retries/idempotency built in. |
| AI | Claude Haiku via `packages/integrations/ai` for item canonicalization/dedup | Cheap, fast, strict-JSON output; called only from Inngest jobs, never client-side. |
| Storage | Firebase Storage via server-side `uploadImage` (firebase-admin) | Category/item images; no client-side Firebase SDK or keys. |
| Caching | Redis short-TTL cache for catalog reads; react-query on both clients; static/ISR for marketing pages | Fast catalog browsing; landing page fully static. |
| Styling | shadcn/ui on web (`packages/ui`, Tailwind 4). Mobile: NativeWind v4 + react-native-reusables. Shared design tokens in `packages/theme` (TS values → CSS vars on web, tailwind.config on mobile). | Visual parity without trying to share component code across DOM/native. |
| i18n | Custom typed `createI18n()` factory (ported) in `packages/i18n`; dictionaries shared by web + mobile | One source of EN/AR strings for both platforms. See [07-i18n-and-rtl.md](./07-i18n-and-rtl.md). |
| Validation | Zod schemas + order status machine + text normalization in `packages/validators`, shared FE/BE | Single source of truth for every input and transition. |
| Env | `@t3-oss/env-core` per server package; mobile bundle gets only `EXPO_PUBLIC_API_URL` | Fail-fast config; zero secrets in the app bundle. |

## 3. Request flows

### Mobile order placement
```
Expo app ── tRPC mutation orders.place (Bearer session) ──▶ /api/trpc
  → ctx: session from Redis, role=customer
  → zod-validate cart, load flat fee from settings, snapshot address
  → INSERT orders + order_items + order_status_events (tx)
  → inngest.send("order/placed")                          ──▶ Inngest
  ← { orderId, orderNumber }                                  → WhatsApp to customer + admin
```

### Customer adds a missing item
```
items.create → normalize(name) → exact alias match? return existing
            → pg_trgm similarity: ≥0.85 add alias, return existing
            → else INSERT item (pending_review) + suggestions
            → inngest.send("catalog/item.created") → Haiku verdict → auto-merge/approve/leave pending
```

### Auth (mobile)
```
auth.requestOtp(phone)  → rate limit → create user if new → user_tokens(OTP, 10min) → Wapilot sendText
auth.verifyOtp(phone, code) → check + consume token → create Redis session → { sessionId, user }
app stores sessionId in expo-secure-store; every request: Authorization: Bearer <sessionId>
```

### Web admin
Same tRPC API, session from cookie; `/admin` layouts additionally verify role server-side
before rendering.

## 4. Environments

| Env | Web/API | DB | Notes |
|---|---|---|---|
| Local | `next dev` + `expo start` (API URL = LAN IP) | Neon dev branch | Inngest dev server (`npx inngest-cli dev`) |
| Production | Vercel | Neon main | Inngest Cloud, EAS builds for mobile |

Required env vars (server): `DATABASE_URL`, `UPSTASH_REDIS_REST_URL/TOKEN`,
`WAPILOT_INSTANCE_ID`, `WAPILOT_API_TOKEN`, `ANTHROPIC_API_KEY`,
`FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY/STORAGE_BUCKET`,
`INNGEST_SIGNING_KEY/EVENT_KEY`, `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `SESSION_SECRET`.
Mobile: `EXPO_PUBLIC_API_URL` only.
