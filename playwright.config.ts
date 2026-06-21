import { defineConfig, devices } from "@playwright/test";

/**
 * Single Playwright runner for the monorepo (docs/12 items 1 & 4).
 *
 * Projects:
 * - `logic`  — pure domain tests, no browser (totals, dedup, normalize, order-status).
 * - `web`    — browser E2E against apps/web (marketing pages, auth redirects, admin flows).
 *
 * The `web` project requires apps/web to be running (webServer below starts it
 * automatically; set BASE_URL to target a different environment).
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  projects: [
    {
      name: "logic",
      testDir: "./tests/logic",
    },
    {
      name: "web",
      testDir: "./tests/e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: BASE_URL,
      },
    },
  ],

  webServer: {
    command: "npm run dev --workspace web",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
