import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests-demo",
  workers: 1,
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        }
      : undefined,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
      BARBERIA_DEMO_DATA_DIR: ".data/e2e",
    },
  },
});
