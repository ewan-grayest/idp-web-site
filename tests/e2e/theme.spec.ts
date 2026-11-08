import { expect, test } from '@playwright/test'

// --c-bg and --c-text from src/styles/tokens.css: the neutral palette since v0.1.1
const DARK_BG = 'rgb(22, 22, 22)' // #161616
const LIGHT_BG = 'rgb(247, 247, 247)' // #f7f7f7
const DARK_TEXT = '#d2d2d2'

const bg = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test('Theme follows the system setting until the visitor picks one', async ({ page, isMobile }) => {
  // Phones keep the switch in the site menu (no room in the header)
  const openMenu = async () => isMobile && (await page.locator('header [data-site-menu]').click())
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  expect(await bg(page)).toBe(DARK_BG)
  await openMenu()
  await page.getByRole('button', { name: 'Светлая тема' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect.poll(() => bg(page)).toBe(LIGHT_BG)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.waitForLoadState('networkidle')
  await openMenu()
  await expect(page.getByRole('button', { name: 'Тёмная тема' })).toBeVisible()
})

test('Home and Promo stay dark in the light theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const homeText = await page.locator('[data-spec="1"]').evaluate((el) => getComputedStyle(el).getPropertyValue('--c-text').trim())
  expect(homeText).toBe(DARK_TEXT)
})
