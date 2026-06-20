import { defineConfig } from "@playwright/test";

/**
 * Single Playwright runner for the monorepo (docs/12 item 1 → item 4).
 *
 * - `logic`: pure domain tests, no browser — totals math, dedup gate, etc.
 *   These run in plain Node (no `page` fixture, no browser download needed).
 *
 * Item 4 will add a second `web` project that drives a real browser against
 * apps/web. The existing Vitest specs in packages/validators (normalize,
 * order-status) stay on Vitest until item 4 consolidates everything here.
 */
export default defineConfig({
  projects: [
    {
      name: "logic",
      testDir: "./tests/logic",
    },
  ],
});
