import { defineConfig, devices } from '@playwright/test'

/** Runs against a dev server with a database (see README). */
export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    // A Russian browser, so Russian addresses are not sent on to /en (src/proxy.ts follows Accept-Language)
    locale: 'ru-RU',
    // Optional: point at an already installed Chromium instead of `npx playwright install`
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
})
