# Security

Real customers, real cash, real phone numbers. Security is a launch requirement, not a
hardening afterthought. This doc is the checklist audited in Phase 9.

## 1. Threat model (what we defend against)

| Threat | Mitigation |
|---|---|
| OTP abuse (SMS-pumping equivalent, WhatsApp spam) | 3 OTP sends/15min/phone + per-IP limits; 6-digit codes, 10-min expiry, 5 attempts then invalidated; resend cooldown 60s |
| Account enumeration | `requestOtp` behaves identically for new/existing phones; generic auth errors; no "user exists" responses |
| Brute force (admin passwords) | scrypt hashing (ported), 5 attempts/min/IP+identifier rate limit, generic errors |
| Session theft | 512-bit random session ids; web: httpOnly + Secure + SameSite=Lax cookie; mobile: expo-secure-store (Keychain/Keystore), never AsyncStorage; server-side revocation on sign-out, password change, role change, suspension |
| Privilege escalation | RBAC procedure middlewares (`adminProcedure`, `driverProcedure`, `customerProcedure`); `/admin` server-layout guard; role changes only via adminProcedure and audited |
| IDOR (reading others' orders/addresses) | every read/mutation filters by ownership: customer `customerId = session.userId`, driver `driverId = session.userId`; admin-only otherwise |
| Order state tampering | status machine validated server-side from `packages/validators`; drivers can only advance their own orders along legal transitions; prices validated positive + bounded; totals recomputed server-side, never trusted from the client |
| Catalog spam/poisoning | items.create 10/hr/user, name validation, pending_review default, admin queue, conservative auto-merge |
| Order spam | orders.place 5/hr/user; suspension switch on users |
| Injection | Drizzle parameterized queries only; Zod validation on every procedure input; no raw SQL string interpolation (trgm queries use bound params) |
| Secrets leakage | t3-env per package; `server-only` on secret-bearing modules; mobile bundle contains only `EXPO_PUBLIC_API_URL`; Firebase admin, Wapilot, Anthropic keys server-side only |
| Webhook forgery | Inngest signing key verification on `/api/inngest` |
| XSS | React escaping; no `dangerouslySetInnerHTML` with user content; user-generated text (item names, notes) rendered as text always |
| CSRF | tRPC mutations are JSON POSTs + SameSite=Lax cookie; no form-encoded state-changing endpoints |
| Transport | HTTPS only (Vercel), HSTS; authed API responses sent with `Cache-Control: no-store` |

## 2. Data protection

- Soft deletes everywhere; account deletion anonymizes PII (name, phone) after the
  retention needs of order history are met.
- Orders snapshot addresses/names — but snapshots are PII too: access restricted by the
  same ownership rules.
- Driver personal data (vehicle, notes) visible to admins only.
- Money: `numeric(10,2)`, server-computed totals, every status change audited in
  `order_status_events` with actor.
- Logs never contain OTPs, session ids, or full phone numbers (mask to last 4 digits).

## 3. Rate limits (Upstash @upstash/ratelimit, sliding window)

| Endpoint | Limit | Key |
|---|---|---|
| auth.requestOtp | 3 / 15 min | phone AND ip |
| auth.verifyOtp | 10 / 15 min | phone |
| auth.signInPassword | 5 / min | ip + email |
| items.create | 10 / hour | userId |
| orders.place | 5 / hour | userId |
| catalog.search | 60 / min | ip or userId |

429 responses map to a friendly bilingual message client-side.

## 4. Mobile-specific

- Session token in expo-secure-store only; wiped on sign-out and on 401.
- No secrets or business logic baked into the bundle; everything authoritative is
  server-side.
- Certificate pinning: deferred (post-MVP) — HTTPS + bearer is the MVP baseline.

## 5. Operational

- Vercel env vars (production scope) — never committed; `.env.example` documents keys
  without values.
- Neon: pooled connection string; separate dev branch for local work.
- Admin accounts: strong passwords, passkeys encouraged (ported support); no shared accounts.
- Dependency hygiene: lockfile committed; `npm audit` in the Phase 11 checklist.
