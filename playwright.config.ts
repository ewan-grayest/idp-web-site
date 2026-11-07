import { defineConfig, devices } from '@playwright/test'

const options = /intro-options\.spec\.ts/
const baseURL = process.env.BASE_URL || 'http://localhost:3000'

/** Runs against a dev server with a database (see README). */
export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    // The visitor has already answered the cookie notice (all services allowed), so it doesn't cover the page.
    // tests/e2e/privacy.spec.ts starts without it
    storageState: {
      cookies: [{ name: 'idp-cookies', value: 'all', domain: new URL(baseURL).hostname, path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }],
      origins: [],
    },
    // A Russian browser, so Russian addresses are not sent on to /en (src/proxy.ts follows Accept-Language)
    locale: 'ru-RU',
    // Optional: point at an already installed Chromium instead of `npx playwright install`
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: 'desktop', testIgnore: options, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', testIgnore: options, use: { ...devices['Pixel 7'] } },
    // Changes the intro video settings for the whole site, so it runs once the others are done
    { name: 'intro-options', testMatch: options, dependencies: ['desktop', 'phone'], use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
})
