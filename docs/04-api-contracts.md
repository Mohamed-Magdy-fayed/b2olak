# API Contracts (tRPC)

Router lives in `packages/api`, served at `/api/trpc`. All inputs/outputs are Zod
schemas from `packages/validators`. Procedure tiers:

| Tier | Requires | Notes |
|---|---|---|
| `baseProcedure` | nothing | public; still rate-limited where it matters |
| `protectedProcedure` | valid session | user not suspended |
| `customerProcedure` | role `customer` | |
| `driverProcedure` | role `driver` + profile `approved` | mutations also verify order ownership |
| `adminProcedure` | role `admin` | |

Context: `{ session, user, db, t, locale }` — session resolved from `session-id`
cookie **or** `Authorization: Bearer <sessionId>`.

---

## auth

| Procedure | Tier | In → Out |
|---|---|---|
| `auth.requestOtp` | base (rate-limited 3/15min/phone) | `{ phone }` → `{ ok }` — creates customer account if phone is new; sends WhatsApp OTP |
| `auth.verifyOtp` | base | `{ phone, code }` → `{ sessionId, user }` — sessionId returned in body for mobile; cookie set for web |
| `auth.signInPassword` | base (rate-limited 5/min) | `{ email, password }` → `{ user }` — web admin; cookie set |
| `auth.signOut` | protected | `{}` → `{ ok }` — deletes server session |
| `auth.me` | protected | `{}` → `{ user, driverProfile? }` |
| `auth.updateProfile` | protected | `{ name?, preferredLocale? }` → `{ user }` |
| `auth.deleteAccount` | customer | `{}` → `{ ok }` — soft delete; blocked if active orders |

## catalog

| Procedure | Tier | In → Out |
|---|---|---|
| `catalog.categories` | base (Redis-cached) | `{}` → `Category[]` (active, sorted) |
| `catalog.itemsByCategory` | base (cached) | `{ categoryId, cursor? }` → paginated `Item[]` (resolves merged chains) |
| `catalog.search` | base (rate-limited) | `{ query }` → `Item[]` — normalized + trgm fuzzy |
| `catalog.popularItems` | base (cached) | `{}` → `Item[]` |
| `items.create` | customer (10/hr) | `{ name, categoryId, defaultUnit }` → `{ item, matched: boolean }` — dedup-aware (see pipeline doc) |

## addresses (customer)

`addresses.list` · `addresses.create` · `addresses.update` · `addresses.delete` (soft)
· `addresses.setDefault` — all standard CRUD with ownership checks.

## orders

| Procedure | Tier | In → Out |
|---|---|---|
| `orders.place` | customer (5/hr) | `{ items: [{itemId, qty, unit, note?}], addressId, note? }` → `{ orderId, orderNumber }` — snapshots address + names + fee, tx with status event |
| `orders.mine` | customer | `{ cursor? }` → orders list (active first) |
| `orders.byId` | customer/driver/admin | `{ orderId }` → full order + lines + timeline (ownership enforced per role) |
| `orders.cancel` | customer | `{ orderId, reason? }` → `{ ok }` — only `placed/assigned` |

## driver

| Procedure | Tier | In → Out |
|---|---|---|
| `driver.setAvailability` | driver | `{ isAvailable }` → `{ ok }` |
| `driver.myOrders` | driver | `{}` → active + history |
| `driver.startShopping` | driver | `{ orderId }` → `{ ok }` (assigned→shopping) |
| `driver.updateLine` | driver | `{ orderItemId, status, actualUnitPrice? }` → `{ line, totals }` — price required for `found/substituted`; recomputes totals |
| `driver.doneShopping` | driver | `{ orderId }` → `{ ok }` — rejects if any line still `pending` |
| `driver.startDelivery` | driver | `{ orderId }` → `{ ok }` |
| `driver.markDelivered` | driver | `{ orderId }` → `{ ok, codTotal }` |

## admin

| Procedure | Tier | In → Out |
|---|---|---|
| `admin.dashboard` | admin | `{}` → KPI counts |
| `admin.orders.list` | admin | `{ status?, cursor? }` → orders board |
| `admin.orders.assign` | admin | `{ orderId, driverId }` → `{ ok }` — driver must be approved+available |
| `admin.orders.cancel` | admin | `{ orderId, reason }` → `{ ok }` |
| `admin.orders.overrideStatus` | admin | `{ orderId, toStatus, note }` → `{ ok }` — audited |
| `admin.drivers.list/create/update/approve/suspend` | admin | driver management (A3) |
| `admin.users.list/suspend/convertToDriver` | admin | user management (A8) |
| `admin.categories.*` | admin | CRUD + image upload (base64 → Firebase URL) |
| `admin.items.list/create/update/merge/unmerge/approve` | admin | catalog + review queue (A5) |
| `admin.reviewQueue.list` | admin | pending items with suggestions |
| `admin.settings.get/update` | admin | system settings |

## i18n / misc

| Procedure | Tier | Notes |
|---|---|---|
| `i18n.setLocale` | base | persists locale (cookie on web; mobile stores locally) |
| `health.ping` | base | `{}` → `{ ok, ts }` — Phase 2 smoke test |

## Conventions

- Mutations return minimal payloads; clients invalidate react-query caches.
- Pagination: cursor-based (`{ cursor, limit }` → `{ items, nextCursor }`).
- Errors: `TRPCError` codes (`UNAUTHORIZED`, `FORBIDDEN`, `TOO_MANY_REQUESTS`,
  `BAD_REQUEST` with Zod issues); user-facing messages are i18n keys, translated client-side.
- All list endpoints exclude soft-deleted rows by default.
