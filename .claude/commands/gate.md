---
description: Run the build gate — typecheck + lint + test + build — and report concisely
---

Run the project's build gate and report results tersely. This is the "must pass after
every substantive change" rule from CLAUDE.md.

Steps:

1. Run, from the repo root, in this order (stop early only if you want to surface a
   failure fast, otherwise run all so the user sees every problem at once):
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`
   - `npm run build`
2. If the user passed a workspace argument (e.g. `/gate apps/web`), scope the runs with
   `--workspace <arg>` for speed (e.g. `npm run typecheck --workspace apps/web`).
3. Report a compact summary: one line per step with ✅/❌. For any failure, show only the
   relevant error lines (file:line + message), not the full log, and do NOT attempt fixes
   unless the user asks — just report.

Notes:
- The shell is Windows / PowerShell; prefer the `npm run …` scripts (Turbo handles
  fan-out and caching) over invoking tools directly.
- `npm run test` runs Playwright (`--project=logic`) — pure domain tests, no browser,
  ~45 s. Always include it; cheapest signal when `packages/validators` changed.
- `npm run test:e2e` runs the browser E2E project against apps/web (requires the dev
  server). Run this only when asked or when touching web UI flows.
