import { defineConfig, devices } from '@playwright/test'

const options = /intro-options\.spec\.ts/
const homeName = /home-name\.spec\.ts/
// Port 3100, never 3000: the site ./start.sh runs is there, and these tests change settings, content and backups
const baseURL = process.env.BASE_URL || 'http://localhost:3100'

/** Runs against a dev server with its own database, uploads and backups (scripts/e2e-server.sh). */
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
    { name: 'desktop', testIgnore: [options, homeName], use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', testIgnore: [options, homeName], use: { ...devices['Pixel 7'] } },
    // Changes the intro video settings for the whole site, so it runs once the others are done
    { name: 'intro-options', testMatch: options, dependencies: ['desktop', 'phone'], use: { ...devices['Desktop Chrome'] } },
    // Takes a name off a Home slide for the whole site, so it also runs once the others are done
    { name: 'home-name', testMatch: homeName, dependencies: ['desktop', 'phone'], use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'sh scripts/e2e-server.sh', url: 'http://localhost:3100/api/health', reuseExistingServer: true, timeout: 300_000 },
})
