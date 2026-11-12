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

test('No language button in the header; the foot of the page has the RU · EN · 中 bar', async ({ page }) => {
  await page.goto('/studio')
  await expect(page.locator('header [data-language-links]')).toHaveCount(0)
  const bar = page.locator('footer [data-language-links]')
  await expect(bar.locator('a')).toHaveText(['RU', 'EN', '中'])
  await expect(bar.locator('a[aria-current="true"]')).toHaveText('RU')
  await page.waitForLoadState('networkidle')
  await bar.locator('a[hreflang="en"]').click()
  await expect(page).toHaveURL(/\/en\/studio$/)
  await expect(page.locator('footer [data-language-links] a[aria-current="true"]')).toHaveText('EN')
})

// The browser's language reaches the site as Accept-Language; the mixed cases are in tests/unit/locales.test.ts
for (const [locale, where] of [
  ['en-US', '/en/studio'],
  ['zh-CN', '/zh/studio'],
  ['de-DE', '/en/studio'],
  ['ru-RU', '/studio'],
] as const) {
  test(`A first visit follows the browser language: ${locale} → ${where}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, locale })
    const page = await context.newPage()
    await page.goto('/studio')
    await expect(page).toHaveURL(new RegExp(`${where.replace(/\//g, '\\/')}$`))
    await context.close()
  })
}

// Playwright's request fixture sends no Accept-Language, like search engines and scripts (Ewan, 2026-11-12)
test('A client that names no language gets English', async ({ request }) => {
  const none = await request.get('/studio', { maxRedirects: 0 })
  expect(none.status()).toBe(307)
  expect(new URL(none.headers().location!).pathname).toBe('/en/studio')
  expect((await request.get('/', { maxRedirects: 0 })).headers().location).toMatch(/\/en$/)
  const russian = await request.get('/studio', { maxRedirects: 0, headers: { 'Accept-Language': 'ru' } })
  expect(russian.status()).toBe(200)
})

test('A language the visitor picked beats the browser language', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: 'en-US' })
  const page = await context.newPage()
  await page.goto('/studio')
  await expect(page).toHaveURL(/\/en\/studio$/)
  await page.waitForLoadState('networkidle')
  await page.locator('footer [data-language-links] a[hreflang="ru"]').click()
  await expect(page).toHaveURL(/\/studio$/)
  await page.goto('/partners')
  await expect(page).toHaveURL(/\/partners$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await context.close()
})

test('Home has its own language links', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
  await page.goto('/en')
  await expect(page.locator('[data-spec="1"] [data-language-links] a[aria-current="true"]')).toHaveText('EN')
  await expect(page.locator('[data-spec="1.1"]')).toHaveAttribute('href', '/en/promo')
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
