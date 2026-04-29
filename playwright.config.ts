import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 *
 * Tests run against a locally-started Vite dev server. Firebase Auth, Firestore,
 * and Functions emulators should be up before the suite starts — either via:
 *
 *   firebase emulators:exec --only auth,firestore,functions "npm run test:e2e"
 *
 * or started separately:
 *
 *   firebase emulators:start --only auth,firestore,functions &
 *   npm run test:e2e
 *
 * Set VITE_USE_EMULATORS=true in .env.test so the React app talks to emulators.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the Vite dev server automatically.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
