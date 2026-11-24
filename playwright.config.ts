import { defineConfig, devices } from "@playwright/test";

// Dedicated port so E2E runs never clash with a dev server on 3030
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  // The server keeps ideas in memory, so tests share state and must run serially
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // CI: compact dot output. Locally: live list plus an HTML report (playwright-report/).
  // open "never" so a failed run doesn't block the terminal serving the report.
  reporter: process.env.CI ? "dot" : [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } }
  ],
  webServer: {
    command: "npm run build && node src/app.ts",
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false
  }
});
