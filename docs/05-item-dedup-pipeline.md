# Item Dedup Pipeline

Goal: a crowd-sourced catalog where "Sugar", "sugar", "sugr" and "سكر" are ONE item,
without blocking the customer who's adding it.

## Principles

1. **Never block the customer** — a new item is usable (orderable, searchable) the
   moment it's created, whatever its review status.
2. **Conservative automation** — auto-merge only when string similarity AND the AI
   agree; everything else goes to the admin queue.
3. **History is immutable** — order lines keep name snapshots; merges repoint
   references but never rewrite the past.

## Stage 1 — Normalization (`packages/validators/src/normalize.ts`)

Pure, unit-tested function applied to every item name, alias, and search query:

- Unicode NFKC → lowercase (case folding) → trim + collapse whitespace → strip punctuation.
- Arabic-specific:
  - strip tashkeel/diacritics (`ً–ْ`, `ٰ`) and tatweel (`ـ`)
  - alef variants `أ إ آ ٱ → ا`
  - `ة → ه`, `ى → ي`, `ؤ → و`, `ئ → ي`
  - Eastern Arabic digits `٠١٢٣٤٥٦٧٨٩ → 0-9`
- Script detection (Arabic vs Latin) decides which normalized column to match against
  and the alias `locale`.

## Stage 2 — Synchronous match at `items.create`

```
input name ──▶ normalize
  1. exact match on item_aliases.normalizedAlias or items.normalizedEn/Ar
        → return existing item (no insert)                     [customer sees "found it"]
  2. pg_trgm similarity() against normalized columns (GIN-indexed)
        ≥ 0.85 → insert raw name as alias → return existing    [same]
        0.45–0.85 → INSERT item (status=pending_review)
                    + top-5 candidates into item_merge_suggestions
        < 0.45  → INSERT item (status=pending_review), no candidates
  3. inngest.send("catalog/item.created", { itemId })
        → return new item                                      [usable immediately]
```

Thresholds are constants in one place; expect tuning with real data — trigram quality
on short Arabic words (3–4 letters) is weaker, which is exactly why Stage 3 exists.

## Stage 3 — Async AI verdict (Inngest: `catalog/item.created`)

Claude Haiku receives: raw name, normalized forms, category, and the candidate list
(ids + bilingual names + aliases). Strict JSON response:

```json
{
  "verdict": "match | no_match | unsure",
  "matchedItemId": "… | null",
  "canonicalNameEn": "Sugar",
  "canonicalNameAr": "سكر",
  "suggestedCategorySlug": "groceries"
}
```

| Verdict | Action |
|---|---|
| `match` AND trgm ≥ 0.7 for that candidate | **Auto-merge**: raw name → alias of canonical; repoint order_items; item → `merged` + `mergedIntoItemId`; suggestion → `accepted`. |
| `match` but trgm < 0.7 | Leave `pending_review` with the AI verdict recorded (admin decides). |
| `no_match` | Fill missing bilingual name from canonical names, item → `approved`. |
| `unsure` | Stays `pending_review`. |
| AI call fails | Item stays `pending_review`, usable; Inngest retries. |

Idempotency: the job re-checks item status before acting (a concurrent admin action wins).

## Stage 4 — Admin review queue (`/admin/items/review`)

- Oldest-first queue of `pending_review` items: raw name, author, AI verdict +
  canonical names, candidates side-by-side with similarity scores.
- Actions: **Merge into candidate** / **Approve as new** (edit bilingual names) /
  **Re-categorize** / bulk approve.
- **Un-merge** available from item detail to recover from a bad auto-merge.

## Read-path rule

Every catalog read (search, browse, cart resolution, order placement) resolves
`mergedIntoItemId` chains to the canonical item. Merged items never appear in results.

## Abuse controls

- `items.create` rate limit: 10/hour/user.
- Name validation: 2–80 chars, letters/digits/spaces (Arabic + Latin), no URLs.
- Daily WhatsApp digest to admin when the pending queue grows.
