import { defineConfig, devices } from "@playwright/test";

const ipad = { width: 1180, height: 820 };

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: { baseURL: "http://localhost:3200", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: ipad,
        permissions: ["camera"],
        // Chrome's built-in test camera stands in for the Canon.
        launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
      },
    },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3200",
    url: "http://localhost:3200/api/health",
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      BOOTH_PIN: "2468",
      SESSION_SECRET: "e2e-session-secret-at-least-32-characters",
      SEEDREAM_FAKE: "1",
      DATA_DIR: ".e2e-data",
      PUBLIC_URL: "http://localhost:3200",
    },
  },
});
