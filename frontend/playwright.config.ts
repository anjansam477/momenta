import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for Momenta.
 *
 * Prereqs (one-time): `npx playwright install` to download browser binaries.
 *
 * Running:
 *   - The backend stack (API + Mongo + Redis) must be up — e.g. `docker compose up`.
 *   - `npm run e2e` starts the Angular dev server (port 4200) automatically via the
 *     `webServer` block below, then runs the specs in ./e2e.
 *
 * In CI, set CI=1 so the dev server is started fresh rather than reused.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
