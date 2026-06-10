# Customer Journeys (Mobile App)

Every screen and action available to a customer. Numbered scenarios; **U-x** marks
unhappy/edge paths. All screens exist in EN and AR (RTL).

---

## C1. Onboarding & Sign-up

**Entry:** customer installs the app (link from the landing page / social campaign).

1. Splash → language picker (العربية / English) on first launch. Choice persists; can be
   changed later in Account. Arabic flips the whole app to RTL.
2. Welcome carousel (2–3 slides: "اطلب" / "نشتري" / "نوصّل") with **Skip**.
3. **Sign up** screen: phone number (Egyptian format, `+20` prefix shown), name.
4. Submit → server validates the phone (E.164), creates the account (role `customer`,
   unverified), sends a 6-digit OTP via WhatsApp.
5. OTP screen: 6-digit input, auto-advance, **Resend** (enabled after 60s countdown).
6. Correct OTP → phone verified, session created (token stored in secure storage) →
   lands on the customer Home tab.

- **U-1 wrong OTP:** inline error "code incorrect"; 5 attempts max, then the code is
  invalidated and the customer must resend.
- **U-2 OTP not received:** Resend after 60s (max 3 sends / 15 min — rate limited).
  Help text: "check that this number has WhatsApp".
- **U-3 phone already registered:** sign-up silently behaves like sign-in (sends OTP to
  the existing account) — prevents account enumeration.
- **U-4 driver phone signs in:** lands in the driver UI, not customer (role-based shell).

## C2. Sign-in / Sign-out / Session

1. **Sign in** screen: phone → OTP via WhatsApp → session. (No passwords for customers.)
2. Session lasts 7 days, sliding renewal on activity. Expired session → silent redirect
   to sign-in, cart preserved locally.
3. **Sign out** from Account tab → server session deleted, secure storage cleared.

- **U-1 suspended account:** sign-in succeeds but every screen is replaced by a
  "account suspended — contact support (WhatsApp link)" state.

## C3. Browse & Search the Catalog

**Home tab.**

1. Home shows: search bar, category grid (bilingual names + images), "popular items"
   rail.
2. Tap a category → item list (image, bilingual name, default unit). Infinite scroll.
3. Search (from any catalog screen): typed text is normalized server-side (case,
   Arabic letter variants, diacritics) and fuzzy-matched — typing `سكر`, `Sugar` or
   `sugr` finds the same item. Results show within the same screen.
4. Tap an item → quantity stepper (respecting unit: piece/kg/gram/liter/pack) +
   optional note ("بلدي وليس مستورد") → **Add to cart**.

- **U-1 no results:** empty state with prominent **"Can't find it? Add it"** button → C4.
- **U-2 offline:** cached last catalog shown with an offline banner; actions queue or
  prompt to retry.

## C4. Add a Missing Item (crowd-sourced catalog)

1. From empty search or category screen → **Add item** sheet: item name (free text, any
   language), category (preselected from context, changeable), default unit.
2. Submit → server normalizes and checks for an existing match:
   - **Exact/close match found:** the existing item is returned with a toast
     "وجدناه! added to catalog already" — no duplicate created.
   - **No match:** item is created (`pending_review`), immediately usable — the customer
     can add it to the cart right away.
3. Behind the scenes an AI job confirms/merges/canonicalizes (see
   [05-item-dedup-pipeline.md](../05-item-dedup-pipeline.md)). If the item is later
   merged, the customer's order lines keep their original snapshot text.

- **U-1 abusive/spam input:** rate limit 10 new items/hour/user; name length & character
  validation; admin review queue catches the rest.

## C5. Cart

**Cart tab** (badge shows count).

1. Lines: item, qty stepper, unit, note, remove. Prices are **not** shown per item in
   MVP (driver buys at market price); copy explains: "هتدفع سعر السوق + رسوم التوصيل".
2. Footer: delivery fee (flat, from settings), "items total: at market price", **Checkout**.
3. Cart persists locally (zustand + storage) across sessions and offline.

- **U-1 item merged/retired while in cart:** line auto-updates to the canonical item
  (name may change); a subtle "updated" badge appears.
- **U-2 empty cart:** empty state with CTA back to Home.

## C6. Addresses

**From checkout or Account tab.**

1. Address list: label (home/work/other), area, street, building, floor, apartment,
   landmark, contact phone (defaults to account phone), default flag.
2. Add/edit address form; optional map pin (lat/lng) — manual fields are the source of
   truth in MVP.
3. Delete = soft delete; orders keep their address snapshot.

- **U-1 first checkout with no address:** checkout opens the add-address form inline.

## C7. Checkout & Place Order

1. Review screen: cart lines, selected address (changeable), optional order note,
   delivery fee, COD explainer ("ادفع كاش عند الاستلام").
2. **Place order** → order created with status `placed`; cart cleared; confirmation
   screen with order number and a "track it" button.
3. WhatsApp confirmation message sent to the customer (Inngest async).

- **U-1 rate limit:** max 5 orders/hour/user → friendly "اهدى شوية 😅" error.
- **U-2 server rejects (validation):** cart preserved, error shown, nothing charged.

## C8. Track an Order

**Orders tab → order detail.**

1. Orders list: active orders pinned on top (status chip), then history.
2. Order detail: status timeline (`placed → assigned → shopping → purchased →
   delivering → delivered`) with timestamps; driver first name shown once assigned;
   line items with their per-line status once shopping starts (found / unavailable);
   actual prices appear as the driver enters them; running COD total.
3. Screen polls while the order is active (react-query refetch interval).
4. On `delivered`: summary receipt (items, actual prices, fee, COD total paid).

- **U-1 item unavailable:** line marked unavailable with a strikethrough; COD total
  excludes it. Customer sees it live and the driver may call (driver journey D5).
- **U-2 order delayed:** no SLA in MVP; support entry point (WhatsApp deep link to the
  ba2olak number) on the order detail screen.

## C9. Cancel an Order

1. Allowed while status is `placed` or `assigned` (before shopping starts).
2. Cancel button on order detail → reason sheet (optional) → confirm.
3. Status becomes `cancelled` (timeline records who/when); driver and admin are
   notified via WhatsApp if a driver was already assigned.

- **U-1 cancel after shopping started:** button hidden; copy directs to support
  (admin can still cancel from the dashboard — admin journey A6).

## C10. Account

1. Profile: name (editable), phone (read-only — identity), preferred language.
2. Addresses management (C6).
3. Language switcher (instant on iOS; Android prompts an app reload for RTL flip).
4. Sign out. Delete account (soft delete; required for app-store policies) with
   confirmation — active orders block deletion.

## C11. Notifications (WhatsApp, MVP)

| Event | Message to customer |
|---|---|
| Order placed | confirmation + order number |
| Driver assigned | driver first name, "started soon" |
| Delivering | "your order is on the way" |
| Delivered | receipt summary + thanks |
| Cancelled (by admin) | reason + support link |
