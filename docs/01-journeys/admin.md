# Admin Journeys (Web Dashboard)

The dashboard lives at `/admin` on the web app, server-side role-guarded. Admins sign in
with email + password (and optionally Google OAuth / passkeys, ported from the reference
auth system). **U-x** marks unhappy/edge paths. Fully bilingual EN/AR with RTL.

---

## A1. Sign-in & Access

1. `/sign-in`: email + password. Optional: Google OAuth button, passkey.
2. Successful sign-in with role `admin` → `/admin`. Non-admin roles are rejected from
   `/admin/**` by the server layout guard (redirect + "not authorized").
3. Sessions: 7-day Redis sessions, httpOnly cookie. Sign-out from the user menu.

- **U-1 brute force:** 5 attempts/min rate limit per IP+identifier; generic error
  message (no user enumeration).

## A2. Dashboard Home

1. KPI cards: orders today (by status), active drivers, pending catalog reviews,
   cash-in-transit (sum of COD totals for `delivering` orders).
2. Live orders board shortcut + pending review queue shortcut.

## A3. Driver Management (`/admin/drivers`)

1. Table: name, phone, vehicle, status (`pending/approved/suspended`), availability,
   active orders count, delivered total.
2. **Add driver**: phone (becomes the sign-in identity), name, vehicle type, plate,
   notes → creates user (role `driver`, phone unverified until first OTP sign-in) +
   `approved` driver profile. The driver just installs the app and signs in.
3. **Approve** a `pending` profile (for converted customers).
4. **Suspend / reactivate** with a required note. Suspending blocks the driver app
   (D1-U1) — but does NOT auto-unassign active orders; the UI warns and lists them so
   the admin reassigns first (A5).
5. Edit vehicle info / notes. Role changes are audited (`createdBy/updatedBy`).

- **U-1 phone already used by a customer:** offered a "convert to driver" action
  instead of creating a duplicate.

## A4. Catalog Management (`/admin/categories`, `/admin/items`)

1. **Categories**: CRUD — bilingual names, slug, image (Firebase upload), sort order,
   active toggle. Deactivating hides the category (items stay searchable).
2. **Items**: table with search + filters (category, status, source). CRUD — bilingual
   names, category, default unit, image. Admin-created items are `approved` immediately.
3. Each item shows its aliases; admin can add/remove aliases manually.
4. Soft delete only; items referenced by orders are never hard-deleted.

## A5. Item Review Queue (`/admin/items/review`)

The human end of the dedup pipeline ([05-item-dedup-pipeline.md](../05-item-dedup-pipeline.md)).

1. Queue of `pending_review` items, oldest first. Each row: raw name as typed, who
   added it, AI verdict + canonical bilingual names (if available), top candidate
   matches with similarity scores, side by side.
2. Actions per item:
   - **Merge into candidate** → raw name becomes an alias of the canonical item; any
     order lines repoint; the duplicate is marked `merged`.
   - **Approve as new** → admin confirms/edits bilingual names + category → `approved`.
   - **Re-categorize** then approve.
3. Bulk approve for obviously fine items.

- **U-1 wrong auto-merge by AI:** admin can un-merge from the item detail (restores the
  item, removes the alias). Auto-merge is conservative at launch precisely to keep this
  rare.

## A6. Orders Board & Dispatch (`/admin/orders`)

The operational heart.

1. Board/table filterable by status; `placed` (needs assignment) is highlighted and
   sorted oldest-first. Columns: order number, customer (name/phone), area, items
   count, created, status, driver.
2. **Assign**: pick from a list of `approved` + available drivers (with their current
   active-order count). Assign → status `assigned`, WhatsApp to driver + customer.
3. **Reassign**: same picker on an `assigned/shopping` order; the old driver is
   notified. Reassignment during `shopping` warns ("driver may have bought items —
   call first").
4. **Cancel** (any pre-delivered status): required reason → status `cancelled`,
   everyone notified.
5. Order detail drawer: full timeline (`order_status_events` with actors), line items
   with per-line status and prices, address, notes, COD total.
6. Status overrides: admin can force a status transition (with note) for recovery
   scenarios — every override is recorded in the timeline.

- **U-1 no available drivers:** assignment list empty → board shows "0 drivers
  available" warning; order waits in `placed`.

## A7. Settings (`/admin/settings`)

1. **Delivery fee** (flat, EGP) — applied to orders at placement time (snapshot; fee
   changes never affect existing orders).
2. **WhatsApp number** for support deep links.
3. Future settings land here (zones, hours, auto-dispatch toggles).

## A8. Users (`/admin/users`)

1. Read-mostly customer list: name, phone, orders count, joined date, status.
2. Actions: suspend/unsuspend (blocks app), convert to driver (A3-U1).

## A9. Notifications (WhatsApp to admin/ops number)

| Event | Message |
|---|---|
| New order placed | order number, area, items count → "assign a driver" |
| Order stuck unassigned > 10 min | reminder (Inngest delayed job) |
| Customer-added item pending review | daily digest (count + examples) |
