# Data Model

All tables share helper columns (ported from the reference app):
`id` (uuid pk), `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`,
`deletedBy` (soft delete — nothing user-facing is hard-deleted).
Money columns are `numeric(10,2)` (never float). Phones are E.164 strings.

## 1. ERD (logical)

```
users 1──1 user_credentials            categories 1──* items
users 1──* user_tokens                 items 1──* item_aliases
users 1──* user_oauth_accounts         items 1──* item_merge_suggestions (as newItem)
users 1──* biometric_credentials       items *──1 items (mergedIntoItemId, self)
users 1──1 driver_profiles  (role=driver)
users 1──* addresses        (role=customer)
users 1──* orders           (as customer)
users 1──* orders           (as driver, nullable)
orders 1──* order_items     (order_items *──1 items)
orders 1──* order_status_events
system_settings (key/value)
```

## 2. Domains & tables

### auth (`packages/db/src/schemas/auth/`)

**users**
| column | type | notes |
|---|---|---|
| phone | text, unique | E.164; identity for customers/drivers |
| email | text, unique, nullable | identity for admins |
| name | text | |
| role | enum `admin \| customer \| driver` | one role per account |
| status | enum `active \| suspended` | suspension blocks the apps |
| phoneVerifiedAt / emailVerifiedAt | timestamp, nullable | |
| preferredLocale | enum `en \| ar`, default `ar` | |
| lastSignInAt | timestamp | |

**user_credentials** — userId (unique FK), passwordHash, salt (scrypt). Admins only in MVP.
**user_tokens** — userId, type enum (`whatsapp_otp | password_reset | email_verify`),
hashedToken, attempts (int), expiresAt, consumedAt. OTPs: 6 digits, 10-min expiry, max 5 attempts.
**user_oauth_accounts**, **biometric_credentials** — ported as-is (web admin convenience).

### drivers (`schemas/drivers/`)

**driver_profiles** — userId (unique FK), status enum (`pending | approved | suspended`),
vehicleType enum (`motorcycle | bicycle | car | on_foot`), vehiclePlate, isAvailable
(boolean, driver-toggled), adminNotes.

### customers (`schemas/orders/addresses`)

**addresses** — userId, label, city, area, street, building, floor, apartment, landmark,
contactPhone, lat/lng (numeric, nullable), isDefault.

### catalog (`schemas/catalog/`)

**categories** — nameEn, nameAr, slug (unique), imageUrl, sortOrder, isActive.

**items**
| column | type | notes |
|---|---|---|
| categoryId | FK | |
| nameEn / nameAr | text | canonical bilingual names (AI/admin fills missing language) |
| normalizedEn / normalizedAr | text | normalized forms; **GIN pg_trgm indexes** |
| imageUrl | text, nullable | |
| defaultUnit | enum `piece \| kg \| gram \| liter \| pack` | |
| status | enum `approved \| pending_review \| merged` | merged items resolve through mergedIntoItemId |
| mergedIntoItemId | self FK, nullable | search/reads always follow the chain |
| source | enum `seed \| customer \| admin` | |
| createdByUserId | FK, nullable | who added it |

**item_aliases** — itemId, alias (raw text as typed), normalizedAlias (**unique**,
trgm-indexed), locale enum (`en | ar | unknown`).

**item_merge_suggestions** — newItemId, candidateItemId, similarityScore numeric,
aiVerdict enum (`match | no_match | unsure`, nullable until job runs), aiCanonicalEn,
aiCanonicalAr, aiSuggestedCategorySlug, status enum (`pending | accepted | rejected`),
resolvedByUserId.

### orders (`schemas/orders/`)

**orders**
| column | type | notes |
|---|---|---|
| orderNumber | serial/int, unique | human-readable |
| customerId | FK users | |
| driverId | FK users, nullable | null until assigned; nullable forever (future merchants) |
| status | enum, see machine below | |
| — address snapshot — | city, area, street, building, floor, apartment, landmark, contactPhone, lat/lng | copied at placement; edits to address book never mutate history |
| deliveryFee | numeric(10,2) | snapshot of the flat fee at placement |
| actualItemsTotal | numeric(10,2), nullable | sum of found lines, set during shopping |
| codTotal | numeric(10,2), nullable | actualItemsTotal + deliveryFee |
| customerNote | text | |
| cancelledBy | enum `customer \| admin`, nullable | + cancelReason text |
| assignedAt / deliveredAt | timestamp | |

**order_items** — orderId, itemId, nameSnapshotEn, nameSnapshotAr (frozen at placement),
qty numeric, unit enum, customerNote, status enum (`pending | found | unavailable |
substituted`), actualUnitPrice numeric nullable, actualLineTotal numeric nullable.

**order_status_events** — orderId, fromStatus, toStatus, actorUserId, actorRole, note.
Written **in the same transaction** as every status change (including admin overrides).

### system (`schemas/system/`)

**system_settings** — key (unique), value (jsonb), description. Seeded keys:
`delivery_fee_egp`, `support_whatsapp_number`.

## 3. Order status machine

Single source of truth in `packages/validators/src/order-status.ts`; the orders router
rejects any transition not in this table.

```
placed ──▶ assigned ──▶ shopping ──▶ purchased ──▶ delivering ──▶ delivered
   │           │            │             │             │
   └───────────┴────────────┴─────────────┴─────────────┘
                         cancelled
```

| From → To | Who |
|---|---|
| placed → assigned | admin (assign driver) |
| assigned → assigned | admin (reassign) |
| assigned → shopping | assigned driver |
| shopping → purchased | assigned driver (all lines resolved) |
| purchased → delivering | assigned driver |
| delivering → delivered | assigned driver |
| placed/assigned → cancelled | customer or admin |
| shopping/purchased/delivering → cancelled | admin only |
| any (recovery override) | admin only, note required, audited |

## 4. Indexes (beyond PKs/uniques)

- `items`: GIN trgm on normalizedEn, normalizedAr; btree (categoryId, status)
- `item_aliases`: GIN trgm on normalizedAlias
- `orders`: (status, createdAt), (driverId, status), (customerId, createdAt)
- `order_status_events`: (orderId, createdAt)
- `user_tokens`: (userId, type), expiresAt for cleanup
- Migration 1 includes `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
