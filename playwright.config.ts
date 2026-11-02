import { defineConfig, devices } from "@playwright/test";

const withSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`);
const external = process.env.BASE_URL;
const baseURL = withSlash(external ?? `http://localhost:4173${process.env.VITE_BASE ?? "/"}`);

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", testMatch: /smoke\.mobile/, use: { ...devices["iPhone 13"] } },
    {
      name: "desktop",
      testMatch: /smoke\.desktop/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, hasTouch: false },
    },
  ],
  ...(external
    ? {}
    : {
        webServer: {
          command: "npm run preview",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
