import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for CreditMiner FE smoke + a11y audits.
 *
 * Assumes the FE dev/prod server is already running on
 * `http://localhost:3000` (see `pnpm test:e2e` script).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
