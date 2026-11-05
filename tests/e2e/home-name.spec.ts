import { expect, test, type APIRequestContext } from '@playwright/test'

import { accountFor, password } from './accounts'

// Главная → «Показывать название на слайде главной» (on by default): one switch for every slide (Ewan, 2026-11-05).
// Needs the sample data, like home.spec.ts. This changes Home for everyone, so playwright.config.ts runs this file on
// its own after the other tests.
const NAME = '[Пример] Кафе «Кирпич»'

async function setShowNames(request: APIRequestContext, showSlideNames: boolean) {
  await request.post('/api/v1/users/login', { data: { email: accountFor(test.info().project.name), password } })
  const saved = await request.post('/api/v1/globals/home', { data: { showSlideNames } })
  expect(saved.ok(), await saved.text()).toBeTruthy()
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
})

test.afterEach(async ({ request }) => {
  await setShowNames(request, true)
})

test('Switched off, no slide shows its name, but each still opens its project and names it to screen readers', async ({ page, request }) => {
  const left = page.locator('[data-spec="1.2"]')
  await page.goto('/')
  await expect(left).toContainText(NAME)

  await setShowNames(request, false)
  await page.goto('/')
  await expect(left).not.toContainText(NAME)
  await expect(page.locator('[data-spec="1.3"]')).not.toContainText('[Пример]')
  await expect(left).toContainText('Смотреть проект')
  const link = left.getByRole('link')
  await expect(link).toHaveAttribute('href', '/projects/public/sample-cafe')
  await expect(link).toHaveAttribute('aria-label', new RegExp(NAME))
})
