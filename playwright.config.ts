import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_URL || "http://127.0.0.1:3210",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", channel: process.env.PLAYWRIGHT_CHANNEL },
    },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: process.env.TEST_URL
    ? undefined
    : {
        command: "npm run start -- --port 3210",
        url: "http://127.0.0.1:3210",
        reuseExistingServer: true,
        timeout: 30000,
      },
});
