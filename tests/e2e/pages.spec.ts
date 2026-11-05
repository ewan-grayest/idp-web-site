import { expect, test } from '@playwright/test'

import { accountFor, password } from './accounts'

// Pages 6 and 10–15 (Ewan, 2026-10-26: every page editable in the admin, legal details and agreement on the site)

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
})

test('Legal 14: company details first, then the documents; the address picks one', async ({ page }) => {
  await page.goto('/legal#personal-data')
  await expect(page.locator('h1')).toHaveText('Юридические аспекты')
  const tabs = page.getByRole('tab')
  await expect(tabs.first()).toHaveText(/Реквизиты/)
  await expect(page.getByRole('tab', { name: /Согласие на обработку персональных данных/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toHaveCount(1)
  await expect(page.getByRole('tabpanel').locator('[data-spec="14.1.1"]')).toHaveText('Согласие на обработку персональных данных')

  await page.getByRole('tab', { name: /Пользовательское соглашение/ }).click()
  await expect(page).toHaveURL(/#terms$/)
  await expect(page.getByRole('tabpanel').locator('[data-spec="14.1.1"]')).toHaveText('Пользовательское соглашение')

  // Footer «Авторское право» on the same page switches the document
  await page.locator('footer').getByRole('link', { name: 'Авторское право' }).click()
  await expect(page.getByRole('tabpanel').locator('[data-spec="14.1.1"]')).toHaveText('Авторское право')
})

test('The enquiry consent links to the personal data consent in a new tab', async ({ page, isMobile }) => {
  test.skip(isMobile, 'same strip on phones')
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  await page.locator('header [data-spec="0.1.4"]').click()
  const terms = page.getByRole('link', { name: /Условия обработки данных/ })
  await expect(terms).toHaveAttribute('href', '/legal#personal-data')
  await expect(terms).toHaveAttribute('target', '_blank')
})

test('Press 10: each article opens its source in a new tab', async ({ page }) => {
  await page.goto('/press')
  const first = page.locator('[data-spec="10.2"] a').first()
  await expect(first).toHaveAttribute('target', '_blank')
  await expect(first).toHaveAttribute('href', /^https?:\/\//)
  await expect(first.locator('[data-spec="10.4"]')).toContainText('·')
})

test('Partners 6: a logo picks the partner, its block shows the discount and projects', async ({ page }) => {
  await page.goto('/partners#sample-furniture')
  await expect(page.locator('h1')).toHaveText('Бонусная система Get-Together')
  await expect(page.locator('[data-spec="6.3.1"]')).toHaveText('[Партнёр GT: мебель]')
  await expect(page.locator('[data-spec="6.3.6"]')).toContainText('−10%')
  await expect(page.locator('[data-spec="6.4.2"] a').first()).toHaveAttribute('href', /\/projects\/residential\//)
  await page.getByRole('tab', { name: '[Партнёр 3]' }).click()
  await expect(page).toHaveURL(/#sample-partner-3$/)
  await expect(page.locator('[data-spec="6.3.1"]')).toHaveText('[Партнёр 3]')
  await expect(page.locator('[data-spec="6.6.1"]')).toHaveText(/Get-Together/)
})

test('A product on a photo opens its partner straight away, with projects and the way to Get-Together', async ({ page }) => {
  await page.goto('/projects/residential/sample-loft')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Открыть кадр 1', exact: true }).click()
  await page.getByRole('button', { name: 'Показать или скрыть товары' }).click()
  const product = page.locator('[data-spec="5.1.3"]').first()
  // The product name first, the shop under it
  await expect(product.locator('span:last-child > span')).toHaveCount(2)
  await product.click()
  await expect(page).toHaveURL(/\/partners#/)
  await expect(page.locator('[data-spec="6.3.1"]')).toBeInViewport()
  await expect(page.locator('[data-spec="6.4.2"] li').first()).toBeVisible()
  await page.locator('[data-gt-link]').click()
  await expect(page.locator('[data-spec="6.1.1"]')).toBeInViewport()
})

test('A document linked inside a partner text shows as a card, not «unknown node»', async ({ page, request }) => {
  await request.post('/api/v1/users/login', { data: { email: 'e2e-desktop@example.ru', password: 'Test12345!' } })
  const project = (await (await request.get('/api/v1/projects?where[slug][equals]=sample-loft&depth=0')).json()).docs[0]
  const text = {
    root: {
      type: 'root', format: '', indent: 0, version: 1, direction: null,
      children: [{ type: 'relationship', relationTo: 'projects', value: project.id, format: '', version: 2 }],
    },
  }
  const slug = `e2e-rel-${Date.now()}`
  const partner = (await (await request.post('/api/v1/partners', { data: { name: 'Проверка связи', slug, text, order: 999 } })).json()).doc
  try {
    await page.goto(`/partners#${slug}`)
    const block = page.locator('[data-spec="6.3.3"]')
    await expect(block).not.toContainText('unknown node')
    await expect(block.getByRole('link', { name: /Лофт/ })).toHaveAttribute('href', '/projects/residential/sample-loft')
  } finally {
    await request.delete(`/api/v1/partners/${partner.id}`)
  }
})

test('Payment 12 shows the admin text; «Вернуться» goes back', async ({ page }) => {
  await page.goto('/studio')
  await page.locator('footer').getByRole('link', { name: 'Способы оплаты' }).click()
  await expect(page.locator('[data-spec="12.1"]')).toContainText('безналичный перевод')
  await page.locator('[data-spec="12.2"]').click()
  await expect(page).toHaveURL(/\/studio$/)
})

test('Media 15 says where its text is written until it is', async ({ page }) => {
  await page.goto('/media')
  await expect(page.locator('[data-spec="15.1"]')).toContainText('Тексты страниц → СМИ и PR')
})

test('Lifestyle 11 has sharing, Careers 13 does not; newest entry first', async ({ page }) => {
  await page.goto('/journal')
  await expect(page.getByRole('tab').first()).toContainText('Выставка в студии')
  await expect(page.locator('[data-spec="11.2"]')).toBeVisible()
  await page.goto('/careers')
  await expect(page.getByRole('tab').first()).toContainText('Дизайнер интерьеров')
  await expect(page.locator('[data-spec="11.2"]')).toHaveCount(0)
})

test('English pages fall back to the Russian text until it is translated', async ({ page }) => {
  await page.goto('/en/legal#terms')
  await expect(page.locator('h1')).toHaveText('Legal')
  await expect(page.getByRole('tabpanel').locator('[data-spec="14.1.1"]')).toHaveText('Пользовательское соглашение')
})

test('The admin edits every page: a section for each, grouped in the side menu', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'the side menu is collapsed on phones')
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(accountFor(testInfo.project.name))
  await page.locator('#field-password').fill(password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/admin$/)
  // In whichever interface language this test user last picked
  const nav = page.locator('nav')
  await expect(nav.getByRole('button', { name: /^(Страницы сайта|Site pages|网站页面)$/ })).toBeVisible()
  for (const path of ['collections/partners', 'collections/issues', 'collections/press', 'collections/lifestyle', 'collections/careers', 'collections/legal', 'globals/studio', 'globals/page-texts']) {
    await expect(nav.locator(`a[href="/admin/${path}"]`)).toBeAttached()
  }
  await page.goto('/admin/globals/studio')
  await expect(page.getByText(/^(Реквизиты|Company details|公司信息)$/).first()).toBeVisible()
})
