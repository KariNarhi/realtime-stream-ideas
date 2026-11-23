const { defineConfig, devices } = require("@playwright/test");

// Dedicated port so E2E runs never clash with a dev server on 3030
const PORT = 3100;

module.exports = defineConfig({
  testDir: "e2e",
  // The server keeps ideas in memory, so tests share state and must run serially
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } }
  ],
  webServer: {
    command: "node app.js",
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false
  }
});
