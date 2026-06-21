import { expect, test } from "@playwright/test";

test.describe("marketing pages", () => {
  test("privacy page renders in English", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText("cash on delivery")).toBeVisible();
  });

  test("terms page renders", async ({ page }) => {
    await page.goto("/terms");
    // heading is either Arabic or English depending on locale
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("auth redirects", () => {
  test("/admin redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("sign-in page renders the form", async ({ page }) => {
    await page.goto("/sign-in");
    // phone input is the first step of CustomerSignIn
    await expect(page.getByRole("textbox")).toBeVisible();
  });
});
