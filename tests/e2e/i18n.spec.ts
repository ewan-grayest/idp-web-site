import { expect, test } from '@playwright/test'

// Site languages: Russian at clean addresses, English and Chinese under /en and /zh.
// Needs the sample data: npx payload run scripts/seed.ts

test('Russian is the default and has no prefix; /ru/… redirects to it', async ({ page }) => {
  await page.goto('/ru/studio')
  await expect(page).toHaveURL(/\/studio$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.locator('[data-spec="3.1.1"]')).toHaveText('Миссия и видение')
})

test('English page: interface, translated content and Russian fallback', async ({ page }) => {
  await page.goto('/en/projects/residential/sample-loft')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('h1').first()).toHaveText('[Sample] Loft on Solyanka')
  await expect(page.locator('[data-spec="5.10.1"]')).toHaveText('Learn more about the project')
  // Not translated yet: the Russian text stands in
  await expect(page.locator('[data-spec="5.4"] p').first()).toContainText('[Идея')
  // Internal links stay in English
  await expect(page.locator('[data-spec="5.3.2"]')).toHaveAttribute('href', /^\/en\/studio\?project=sample-loft#team$/)
  await expect(page.locator('footer a[href="/en/payment"]')).toBeVisible()
})

test('Language links keep the page and section', async ({ page }) => {
  await page.goto('/en/studio#team')
  await page.waitForLoadState('networkidle')
  await page.locator('footer [data-language-links] a[hreflang="zh"]').click()
  await expect(page).toHaveURL(/\/zh\/studio#team$/)
  await expect(page.locator('[data-spec="3.2.1"]')).toHaveText('我们的团队')
  await page.waitForLoadState('networkidle')
  await page.locator('footer [data-language-links] a[hreflang="ru"]').click()
  await expect(page).toHaveURL(/\/studio#team$/)
  await expect(page.locator('[data-spec="3.2.1"]')).toHaveText('Наша команда')
})

test('Header language list on desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Phones list the languages in the footer')
  await page.goto('/studio')
  await page.locator('[data-language-switch]').click()
  await page.locator('header [data-language-links] a[hreflang="en"]').click()
  await expect(page).toHaveURL(/\/en\/studio$/)
  await expect(page.locator('[data-language-switch]')).toHaveText('EN')
})

test('Home has its own language links', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
  await page.goto('/en')
  await expect(page.locator('[data-spec="1"] [data-language-links] a[aria-current="true"]')).toHaveText('EN')
  await expect(page.locator('[data-spec="1.1"]')).toHaveAttribute('href', '/en/studio')
})

test('Enquiry from an English page says which language the visitor used', async ({ page }) => {
  await page.goto('/en/studio')
  await page.waitForLoadState('networkidle')
  let sent: Record<string, unknown> | null = null
  await page.route('**/api/v1/leads', async (route) => {
    sent = route.request().postDataJSON()
    await route.fulfill({ status: 201, body: '{}' })
  })
  await page.locator('[data-spec="0.1.4"]').click()
  await page.locator('[data-spec="0.1.7"]').fill('test@example.com')
  await page.locator('[data-spec="0.1.9"]').check()
  await page.locator('[data-spec="0.1.4"]').click()
  await expect(page.getByText('Thank you! We will be in touch.')).toBeVisible()
  expect(sent).toMatchObject({ locale: 'en', context: 'Request a call · Mission and vision' })
})
