import { defineConfig, devices } from "@playwright/test"

// End-to-end tests against the real app: frontend, backend and database.
// Locally they reuse the running dev servers; in CI Playwright starts them.
//
// DEMO=1 turns the same scenarios into a guided walkthrough for the PO: a
// visible browser, slowed-down actions, captions and a pause after each step
// (see e2e/support/demo.ts and `pnpm frontend demo`).
const isCI = Boolean(process.env.CI)
const isDemo = process.env.DEMO === "1"

export default defineConfig({
  testDir: "e2e",
  // Demo pauses for as long as the presenter needs.
  timeout: isDemo ? 0 : 90_000,
  expect: { timeout: 10_000 },
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3050",
    locale: "cs-CZ",
    timezoneId: "Europe/Prague",
    headless: !isDemo,
    launchOptions: { slowMo: isDemo ? Number(process.env.DEMO_SLOWMO ?? 350) : 0 },
    trace: isCI ? "retain-on-failure" : "off",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter backend start",
      url: "http://localhost:4050/api/health",
      reuseExistingServer: !isCI,
      cwd: "../..",
      timeout: 180_000,
    },
    {
      command: "pnpm --filter frontend dev",
      url: "http://localhost:3050",
      reuseExistingServer: !isCI,
      cwd: "../..",
      timeout: 120_000,
    },
  ],
})
