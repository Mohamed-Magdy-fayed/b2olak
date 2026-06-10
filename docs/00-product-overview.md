# ba2olak — Product Overview

> **ba2olak** (بقولك — "I'm telling you") is a delivery/errand app for the Egyptian market.
> Customers order grocery and market items from their phone; a ba2olak driver shops for
> the items in real stores and delivers them to the customer's door, collecting cash on delivery.

## 1. Vision

Buying daily groceries in Egypt means walking to several stores, queueing, and carrying
bags home. ba2olak turns that into a 2-minute phone interaction: pick your items, drop a
pin, and a driver does the rest. The product is built mobile-first for a Gen-Z audience —
bold, fast, bilingual (Arabic-first), and trustworthy.

**Long-term:** markets/stores register on the platform and pre-fulfill orders so drivers
only pick up and deliver. The MVP data model deliberately leaves room for this
(`orders.driverId` is nullable, items track a `source`, a future `merchants` domain is
namespaced away from `drivers`).

## 2. Roles

| Role | Platform | What they do |
|---|---|---|
| **Customer** | Mobile app | Browse/search catalog, build a cart, add missing items, manage addresses, place COD orders, track order status. |
| **Driver** | Mobile app (same app, driver UI) | See assigned orders, shop for items in stores, mark items found/unavailable, enter actual prices, deliver, collect cash. |
| **Admin** | Web dashboard | Manage drivers (approve/suspend), assign orders to drivers, moderate the crowd-sourced catalog (merge duplicates), configure settings (delivery fee), monitor everything. |
| **Visitor** | Web landing page | Learns about the app from social campaigns, downloads it. Tracked via Meta Pixel / GA4. |

One account = one role (`admin | customer | driver`). Drivers are created by sign-up +
admin approval; admins are seeded/promoted manually.

## 3. Scope

### In MVP
- Crowd-sourced bilingual catalog: seeded categories + items; any customer can add a
  missing item; AI + text normalization dedupe variants ("Sugar" = "sugar" = "سكر").
- Customer ordering: cart → address → flat delivery fee → place order (COD).
- Manual dispatch: admin assigns each order to an available, approved driver.
- Driver fulfillment: shopping checklist, actual prices, item availability, COD total,
  status progression visible to the customer in near-real-time (polling).
- Phone + WhatsApp OTP auth on mobile; email/password (+ Google OAuth) for web admin.
- WhatsApp notifications on order events (via Wapilot).
- Full EN/AR + RTL on web and mobile; shadcn design system on both.
- Marketing landing page with campaign tracking.

### Out of MVP (deliberately)
- Merchant/market self-service (future phase — schema-compatible).
- Online payments (Paymob/Fawry) — COD only; money columns ready for it.
- Live GPS driver tracking & push notifications — status timeline + WhatsApp instead.
- Auto-dispatch / nearest-driver assignment.
- Driver cash settlement ledger (fast-follow after launch).
- Promotions, coupons, referral codes.

## 4. Core flow (the happy path)

```
Customer (mobile)          Admin (web)              Driver (mobile)
─────────────────          ───────────              ───────────────
browse/search items
add to cart
pick address
place order (COD)  ──────▶ sees new order
                           assigns driver  ───────▶ sees assigned order
                                                    starts shopping
                                                    marks items found/unavailable
                                                    enters actual prices
                                                    "purchased" → "delivering"
watches status timeline ◀──────────────────────────  arrives, hands over
pays cash (items+fee)                                marks delivered
```

Order status machine: `placed → assigned → shopping → purchased → delivering → delivered`,
with `cancelled` reachable from early states (see [03-data-model.md](./03-data-model.md)).

## 5. Glossary (EN / AR)

| Term | Arabic | Meaning |
|---|---|---|
| Order | طلب | A customer request containing one or more items. |
| Item | صنف | A catalog product (e.g., sugar). Canonical, bilingual. |
| Alias | اسم بديل | An alternate spelling/name pointing to a canonical item. |
| Category | قسم | Top-level grouping (e.g., groceries, dairy). |
| Driver | طيّار | The person who shops and delivers. |
| COD total | الإجمالي كاش | Actual items total + delivery fee, collected in cash. |
| Delivery fee | رسوم التوصيل | Flat, admin-configurable fee per order. |
| Shopping | بيشتري | Driver is inside stores buying the items. |
| Pending review | قيد المراجعة | A customer-added item awaiting dedup/approval. |

## 6. Documentation map

| Doc | Contents |
|---|---|
| [01-journeys/customer.md](./01-journeys/customer.md) | Every customer scenario, step by step, incl. unhappy paths |
| [01-journeys/driver.md](./01-journeys/driver.md) | Every driver scenario |
| [01-journeys/admin.md](./01-journeys/admin.md) | Every admin scenario |
| [02-architecture.md](./02-architecture.md) | System diagram, request flows, hosting |
| [03-data-model.md](./03-data-model.md) | ERD, enums, order status machine |
| [04-api-contracts.md](./04-api-contracts.md) | tRPC routers & procedures inventory |
| [05-item-dedup-pipeline.md](./05-item-dedup-pipeline.md) | Normalization + AI dedup design |
| [06-security.md](./06-security.md) | Threat model + security checklist |
| [07-i18n-and-rtl.md](./07-i18n-and-rtl.md) | EN/AR + RTL strategy, web & mobile |
| [08-file-structure.md](./08-file-structure.md) | Complete planned repo tree |
| [09-roadmap.md](./09-roadmap.md) | Phase-by-phase build plan & commits |
