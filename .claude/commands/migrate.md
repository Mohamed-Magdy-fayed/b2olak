---
description: Schema-first Drizzle migration workflow — generate, migrate, verify, stage. Never db:push.
---

Run the schema-first database workflow for ba2olak. **Never use `db:push`** — it leaves
no migration file, so QA/prod never receive the change.

1. **Confirm the schema edits.** Show what changed under `packages/db/src/schemas/*`
   (and that it's exported from `packages/db/src/schema.ts`). If no schema change is
   staged yet, ask what the intended change is and make it first.
2. **Generate**: `npm run db:generate` (drizzle-kit generate). This writes a new `.sql`
   into `packages/db/migrations/` and updates `migrations/meta/_journal.json` + snapshot.
3. **Review the generated SQL.** Read the new file. Do NOT hand-edit it for ordinary
   shape changes. Sanity-check it matches the intended change.
4. **Apply**: `npm run db:migrate`. Verify it applied cleanly — no "relation already
   exists" (that error usually means someone `db:push`ed instead of generating; stop and
   surface it).
5. **Data migration check.** If the change affects existing **data**, not just shape
   (setting NOT NULL on a populated column, type conversions, splitting/merging columns,
   seeding/transforming rows), the structural migration is not enough. Add the data step
   as hand-written SQL (this is the one allowed exception to "never hand-edit"), with a
   clear comment on the data effect, and apply it.
6. **Stage together**: the generated `.sql`, the updated `meta/_journal.json`, and the
   `meta/*_snapshot.json`. Tell the user these must be committed as one unit. Do not
   commit unless they ask.

If you're ever about to run `db:push`, stop — that's blocked by a hook and violates the
schema-first rule. Use this workflow instead.
