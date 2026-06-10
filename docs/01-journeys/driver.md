# Driver Journeys (Mobile App — driver UI)

Same Expo app as customers; after sign-in, accounts with role `driver` get the driver
shell. **U-x** marks unhappy/edge paths.

---

## D1. Becoming a Driver

Drivers are onboarded by the operation, not self-service in MVP:

1. Admin creates the driver account from the dashboard (phone, name, vehicle type,
   plate) — see admin journey A3. Driver profile starts as `approved` when admin-created.
2. Alternatively a person signs up in the app as a customer and asks (offline/WhatsApp)
   to become a driver; admin converts the role + creates the driver profile.
3. Driver installs the same app, signs in with phone + WhatsApp OTP, and lands in the
   driver shell.

- **U-1 pending/suspended driver signs in:** sees a blocked state ("حسابك قيد المراجعة" /
  "suspended") with a support WhatsApp link; no orders visible.

## D2. Availability

1. Driver home shows a prominent **Available / Unavailable** toggle.
2. Only `approved` + available drivers appear in the admin's assignment picker.
3. Going unavailable does NOT affect already-assigned orders — they must be finished
   or reassigned by admin.

## D3. Receiving an Assignment

1. Admin assigns an order → driver receives a WhatsApp notification + the order appears
   in **My Orders** (active section), status `assigned`.
2. Order card: order number, customer area (not full address yet), item count,
   created time.
3. Driver opens the order → full detail: items list (name, qty, unit, per-line notes),
   delivery address + landmark, customer note, customer phone (tap to call / WhatsApp),
   delivery fee.
4. Driver taps **Start shopping** → status `shopping`; customer sees it live.

- **U-1 driver can't take it:** no reject button in MVP — driver calls the admin;
  admin reassigns (A5). Reassignment moves the order to another driver's list.
- **U-2 multiple active orders:** allowed; My Orders lists them all; each progresses
  independently.

## D4. Shopping (the checklist)

The core driver screen — built for one-handed use inside a noisy market.

1. Checklist of order lines. Each line: bilingual item name (snapshot), qty + unit,
   customer note, and actions:
   - **Found** → enter actual unit price (numeric pad, EGP) → line total auto-computed.
   - **Unavailable** → line struck through, excluded from totals. Optional quick call
     button to confirm with the customer first.
2. Running totals pinned at the bottom: items total (sum of found lines) + delivery fee
   = **COD total**, updating live (and on the customer's screen via polling).
3. When every line is resolved (found or unavailable) → **Done shopping** button →
   status `purchased`.

- **U-1 price typo:** prices editable until status moves to `delivering`. Server
  validates positive, bounded values.
- **U-2 substitution:** MVP keeps it simple — driver calls the customer; if accepted,
  the driver edits the line's price/note (line status `substituted`).
- **U-3 everything unavailable:** driver calls admin; admin cancels (A6) — driver
  cannot cancel orders himself.
- **U-4 connectivity loss in the market:** mutations retry (react-query); checklist
  state is server-persisted per line, so a re-open resumes where he left off.

## D5. Delivering

1. **Start delivery** → status `delivering`; customer notified via WhatsApp.
2. Delivery screen: address block (copyable), landmark, customer phone (call/WhatsApp
   buttons), COD total in large type.
3. At the door: collect cash (items total + delivery fee), tap **Delivered** →
   confirmation dialog ("collected X EGP?") → status `delivered`, timeline closed,
   customer gets receipt message.

- **U-1 customer unreachable:** call buttons + retry; if undeliverable, driver calls
  admin → admin cancels with reason `customer_unreachable` (COD dispute handling is an
  operations process in MVP, recorded in admin notes).
- **U-2 customer disputes total:** receipt math is on both screens (line prices ×
  qty + fee); driver can re-open price edit only via admin in `delivering` state.

## D6. Order History & COD recap

1. **My Orders → History**: delivered/cancelled orders with COD totals.
2. Daily recap line on top: today's delivered count + total cash collected (helps the
   end-of-day handover to the operation). A full settlement ledger is post-MVP.

## D7. Account

1. Profile (name, phone read-only, vehicle info read-only — admin edits those).
2. Language switcher, sign out — same as customer (C10), minus account deletion
   (drivers are deactivated by admin instead).

## D8. Notifications (WhatsApp)

| Event | Message to driver |
|---|---|
| Order assigned | order number + area + item count |
| Order reassigned away | "order X reassigned, no action needed" |
| Order cancelled (while his) | "order X cancelled — stop fulfillment" |
