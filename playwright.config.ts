import { defineConfig, devices } from '@playwright/test'

const options = /intro-options\.spec\.ts/
const homeName = /home-name\.spec\.ts/

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
    { name: 'desktop', testIgnore: [options, homeName], use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', testIgnore: [options, homeName], use: { ...devices['Pixel 7'] } },
    // Changes the intro video settings for the whole site, so it runs once the others are done
    { name: 'intro-options', testMatch: options, dependencies: ['desktop', 'phone'], use: { ...devices['Desktop Chrome'] } },
    // Takes a name off a Home slide for the whole site, so it also runs once the others are done
    { name: 'home-name', testMatch: homeName, dependencies: ['desktop', 'phone'], use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
})
