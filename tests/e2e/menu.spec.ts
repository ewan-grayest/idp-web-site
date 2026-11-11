import { expect, test } from '@playwright/test'

// Site menu (not in the spec): every section from every page except Home

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
})

const panel = (page: import('@playwright/test').Page) => page.locator('[data-site-menu-panel]')

test('The ID logo opens the menu, which leads to every main section; Home has none', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-site-menu]')).toHaveCount(0)
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  // The ID logo 0.1.1 at the top left is the menu button, and there is no other one (Ewan, 2026-11-11)
  await expect(page.locator('header [data-site-menu]')).toHaveCount(1)
  await expect(page.locator('header [data-site-menu]')).toHaveAttribute('data-spec', '0.1.1')
  await expect(page.locator('header [data-site-menu]')).toHaveText('ID')
  await page.locator('header [data-site-menu]').click()
  const menu = page.getByRole('dialog', { name: 'Меню' })
  await expect(menu).toBeVisible()
  for (const name of ['Главная', 'Студия', 'Команда', 'Жилые интерьеры', 'Общественные интерьеры', 'Партнёры']) {
    await expect(menu.getByRole('navigation', { name: 'Разделы сайта' }).getByRole('link', { name })).toBeVisible()
  }
  // Archive projects were out of the menu and footer (Ewan, 2026-10-26); as product design they are under ID Lab,
  // which only the footer links to (Ewan, 2026-11-05)
  await expect(page.locator('a[href$="/projects/archive"]')).toHaveCount(0)
  await expect(menu.locator('a[href$="/id-lab"]')).toHaveCount(0)
  await menu.getByRole('link', { name: 'Жилые интерьеры' }).click()
  await expect(page).toHaveURL(/\/projects\/residential$/)
  await expect(panel(page)).toHaveCount(0)
})

test('Header menu marks the current page; Escape closes it and gives focus back', async ({ page }) => {
  await page.goto('/projects/public')
  await page.waitForLoadState('networkidle')
  const button = page.locator('header [data-site-menu]')
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expect(panel(page).locator('a[aria-current="page"]')).toHaveText(/Общественные интерьеры/)
  await expect(panel(page).getByRole('button', { name: 'Закрыть меню' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
  await expect(button).toBeFocused()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
})

test('A section link on the same page closes the menu', async ({ page }) => {
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  await page.locator('header [data-site-menu]').click()
  await panel(page).getByRole('link', { name: 'Как нас найти' }).click()
  await expect(page).toHaveURL(/\/studio#contacts$/)
  await expect(panel(page)).toHaveCount(0)
})

test('The menu speaks the page language and keeps it', async ({ page }) => {
  await page.goto('/en/studio')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Open the menu' }).click()
  const link = panel(page).getByRole('link', { name: 'Public interiors' })
  await expect(link).toHaveAttribute('href', '/en/projects/public')
  await expect(panel(page).getByRole('link', { name: 'info@id-proekt.com' })).toBeVisible()
})
